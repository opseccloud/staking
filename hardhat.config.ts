import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-deploy";
import dotenv from "dotenv";

dotenv.config();

const dummyPrivateKey = "0x" + Array(32).fill("00").join("");

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
        blockNumber: 19020069,
      },
    },
    mainnet: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY
          ? `0x${process.env.DEPLOYER_PRIVATE_KEY}`
          : dummyPrivateKey,
      ],
    },
    sepolia: {
      url: `${process.env.RPC_KEY}`,
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY
          ? `0x${process.env.DEPLOYER_PRIVATE_KEY}`
          : dummyPrivateKey,
      ],
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  typechain: {
    outDir: "typechain",
  },
};

export default config;