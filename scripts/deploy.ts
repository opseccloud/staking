import { ethers, upgrades } from "hardhat";

async function main() {
  const OpsecStaking = await ethers.getContractFactory("OpsecStaking");

  const opsecTokenAddress = '0x6a7eff1e2c355ad6eb91bebb5ded49257f3fed98';

  const opsecStaking = await upgrades.deployProxy(OpsecStaking, [opsecTokenAddress], { initializer: 'initialize' });

  await opsecStaking.waitForDeployment();

  console.log(`OpsecStaking deployed to: ${await opsecStaking.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});