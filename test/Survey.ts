import { expect } from "chai";
import { network } from "hardhat";
import { parseEther, getCreateAddress } from "ethers";
import type { SurveyFactory } from "../types/ethers-contracts/SurveyFactory.js";

// import { expect } from "chai";
// import { network } from "hardhat";

// interface Question {
//     question: string;
//     options: string[];
// }
// it("Survey init", async () => {
//     const { ethers } = await network.connect();
    
//     const title="막무가내 설문조사";
//     const description = "중앙화된 설문조사로서, 모든 데이터는 공개되지 않으며...";
//     const questions: Question[] = [
//         {
//             question: "누가 내 응답을 관리...",
//             options: ["구글폼 운영자", "탈중앙화된 블록체인", "상관없음"],
//         }
//     ];
//     const factory = await ethers.deployContract("SurveyFactory", [
//         ethers.parseEther("50"),
//         ethers.parseEther("0.1"),
//     ]);
//     const tx = await factory.createSurvey({
//         title,
//         description,
//         targetNumber: 100,
//         questions,
//     },
//     {
//         value: ethers.parseEther("100")
//     });

//     // const surveys = await factory.getSurveys()
//     const receipt = await tx.wait();
//     let surveyAddress;
//     receipt?.logs.forEach((log) => {
//         const event = factory.interface.parseLog(log);
//         if (event?.name == "SurveyCreated") {
//             surveyAddress = event.args[0];
//         }
//     });

//     const surveyC = await ethers.getContractFactory("Survey");
//     const signers = await ethers.getSigners();
//     const respondent = signers[0];
//     if (surveyAddress) {
//         const survey = await surveyC.attach(surveyAddress);
//         await survey.connect(respondent);
//         console.log(await ethers.provider.getBalance(respondent));
//         const submitTx = await survey.submitAnswer({
//             respondent,
//             answers: [1],
//         });
//         await submitTx.wait(0)
//         console.log(await ethers.provider.getBalance(respondent));
//     }
// });


describe("SurveyFactory Contract", () => {
  let factory: SurveyFactory, owner, respondent1, respondent2;

  const questions = [
    {
      question: "누가 내 응답을 관리하면 좋을까요?",
      options: ["구글폼 운영자", "탈중앙화된 블록체인", "상관없음"],
    },
  ];

  const makeSchema = (title: string, targetNumber: number) => ({
    title,
    description: "테스트 설문조사",
    targetNumber,
    questions,
  });

  beforeEach(async () => {
    const { ethers } = await network.connect();
    [owner, respondent1, respondent2] = await ethers.getSigners();

    factory = await ethers.deployContract("SurveyFactory", [
      ethers.parseEther("50"), // min_pool_amount
      ethers.parseEther("0.1"), // min_reward_amount
    ]);
  });

  it("should deploy with correct minimum amounts", async () => {
    // TODO: check min_pool_amount and min_reward_amount
    expect(await factory.min_pool_amount()).to.equal(parseEther("50"));
    expect(await factory.min_reward_amount()).to.equal(parseEther("0.1"));
  });

  it("should create a new survey when valid values are provided", async () => {
    // TODO: prepare SurveySchema and call createSurvey with msg.value
    // TODO: check event SurveyCreated emitted
    // TODO: check surveys array length increased
    const before = await factory.getSurveys();
    const expectedAddress = getCreateAddress({
      from: await factory.getAddress(),
      nonce: 1,
    });

    await expect(
      factory.createSurvey(makeSchema("설문1", 100), {
        value: parseEther("100"),
      }),
    )
      .to.emit(factory, "SurveyCreated")
      .withArgs(expectedAddress);

    const after = await factory.getSurveys();
    expect(after.length).to.equal(before.length + 1);
    expect(after[after.length - 1]).to.equal(expectedAddress);
  });

  it("should revert if pool amount is too small", async () => {
    // TODO: expect revert when msg.value < min_pool_amount
    await expect(
      factory.createSurvey(makeSchema("설문1", 100), {
        value: parseEther("49"),
      }),
    ).to.be.revertedWith("Insufficient pool amount");
  });

  it("should revert if reward amount per respondent is too small", async () => {
    // TODO: expect revert when msg.value / targetNumber < min_reward_amount
    await expect(
      factory.createSurvey(makeSchema("설문1", 1000), {
        value: parseEther("50"),
      }),
    ).to.be.revertedWith("Insufficient reward amount");
  });

  it("should store created surveys and return them from getSurveys", async () => {
    // TODO: create multiple surveys and check getSurveys output
    const factoryAddress = await factory.getAddress();
    const expected = [1, 2, 3].map((nonce) =>
      getCreateAddress({ from: factoryAddress, nonce }),
    );

    for (let i = 0; i < expected.length; i++) {
      await factory.createSurvey(makeSchema(`설문${i + 1}`, 100), {
        value: parseEther("100"),
      });
    }

    const surveys = await factory.getSurveys();
    expect(surveys.length).to.equal(3);
    expect(surveys).to.deep.equal(expected);
  });
});
