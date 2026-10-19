import { expect } from "chai";
import { network } from "hardhat";

interface Question {
  question: string;
  options: string[];
}

describe("Survey init", () => {
  const title = "막무가내 설문조사라면";
  const description =
    "중앙화된 설문조사로서, 모든 데이터는 공개되지 않으며 설문조사를 게시한자만 볼 수 있습니다.";
  const questions: Question[] = [
    {
      question: "누가 내 응답을 관리할때 더 솔직할 수 있을까요?",
      options: [
        "구글폼 운영자",
        "탈중앙화된 블록체인 (관리주체 없으며 모든 데이터 공개)",
        "상관없음",
      ],
    },
  ];

  const getSurveyContractAndEthers = async (
    survey: {
      title: string;
      description: string;
      targetNumber: number;
      questions: Question[];
    },
    pool: bigint = 0n,
  ) => {
    const { ethers } = await network.connect();
    const cSurvey = await ethers.deployContract(
      "Survey",
      [survey.title, survey.description, survey.targetNumber, survey.questions],
      { value: pool },
    );
    return { ethers, cSurvey };
  };

  describe("Deployment", () => {
    it("should store survey info correctly", async () => {
      const { cSurvey } = await getSurveyContractAndEthers({
        title,
        description,
        targetNumber: 5,
        questions,
      });

      expect(await cSurvey.title()).to.equal(title);
      expect(await cSurvey.description()).to.equal(description);
      expect(await cSurvey.targetNumber()).to.equal(5n);
      expect(await cSurvey.rewardAmount()).to.equal(0n);
    });

    it("should calculate rewardAmount correctly", async () => {
      const pool = 10n ** 18n;
      const { ethers, cSurvey } = await getSurveyContractAndEthers(
        { title, description, targetNumber: 3, questions },
        pool,
      );

      expect(await cSurvey.rewardAmount()).to.equal(pool / 3n);
      expect(await ethers.provider.getBalance(cSurvey)).to.equal(pool);
    });
  });

  describe("Questions and Answers", () => {
    it("should return questions correctly", async () => {
      const twoQuestions: Question[] = [
        ...questions,
        { question: "설문 보상은 얼마가 적당할까요?", options: ["0.1 ETH", "1 ETH"] },
      ];
      const { cSurvey } = await getSurveyContractAndEthers({
        title,
        description,
        targetNumber: 5,
        questions: twoQuestions,
      });

      const stored = await cSurvey.getQuestions();

      expect(stored).to.have.lengthOf(twoQuestions.length);
      stored.forEach((q, i) => {
        expect(q.question).to.equal(twoQuestions[i].question);
        expect([...q.options]).to.deep.equal(twoQuestions[i].options);
      });
    });

    it("should allow valid answer submission", async () => {
      const { ethers, cSurvey } = await getSurveyContractAndEthers({
        title,
        description,
        targetNumber: 5,
        questions,
      });
      const [, alice, bob] = await ethers.getSigners();

      await cSurvey
        .connect(alice)
        .submitAnswer({ respondent: alice.address, answers: [2] });
      await cSurvey
        .connect(bob)
        .submitAnswer({ respondent: bob.address, answers: [0] });

      const answers = await cSurvey.getAnswers();

      expect(answers).to.have.lengthOf(2);
      expect(answers[0].respondent).to.equal(alice.address);
      expect(answers[0].answers.map(Number)).to.deep.equal([2]);
      expect(answers[1].respondent).to.equal(bob.address);
      expect(answers[1].answers.map(Number)).to.deep.equal([0]);
    });

    it("should revert if answer length mismatch", async () => {
      const { ethers, cSurvey } = await getSurveyContractAndEthers({
        title,
        description,
        targetNumber: 5,
        questions,
      });
      const [, alice] = await ethers.getSigners();

      for (const answers of [[], [0, 1]]) {
        await expect(
          cSurvey
            .connect(alice)
            .submitAnswer({ respondent: alice.address, answers }),
        ).to.be.revertedWith("Mismatched answers length");
      }

      expect(await cSurvey.getAnswers()).to.have.lengthOf(0);
    });

    it("should revert if target reached", async () => {
      const { ethers, cSurvey } = await getSurveyContractAndEthers({
        title,
        description,
        targetNumber: 1,
        questions,
      });
      const [, alice, bob] = await ethers.getSigners();

      await cSurvey
        .connect(alice)
        .submitAnswer({ respondent: alice.address, answers: [1] });

      await expect(
        cSurvey
          .connect(bob)
          .submitAnswer({ respondent: bob.address, answers: [1] }),
      ).to.be.revertedWith("This survey has been ended");

      expect(await cSurvey.getAnswers()).to.have.lengthOf(1);
    });
  });

  describe("Rewards", () => {
    it("should pay correct reward to respondent", async () => {
      const targetNumber = 2;
      const pool = 3n * 10n ** 18n;
      const { ethers, cSurvey } = await getSurveyContractAndEthers(
        { title, description, targetNumber, questions },
        pool,
      );
      const [, alice, bob] = await ethers.getSigners();
      const reward = pool / BigInt(targetNumber);

      await expect(
        cSurvey
          .connect(alice)
          .submitAnswer({ respondent: alice.address, answers: [0] }),
      ).to.changeEtherBalances(ethers, [alice, cSurvey], [reward, -reward]);

      await expect(
        cSurvey
          .connect(bob)
          .submitAnswer({ respondent: bob.address, answers: [1] }),
      ).to.changeEtherBalances(ethers, [bob, cSurvey], [reward, -reward]);

      expect(await ethers.provider.getBalance(cSurvey)).to.equal(0n);
    });
  });
});
