import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "ethers";

export default buildModule("SurveyFactoryModule", (m) => {
  const surveyFactory = m.contract("SurveyFactory", [
    parseEther("50"),
    parseEther("0.1"),
  ]);

  return { surveyFactory };
});
