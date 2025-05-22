require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    core_testnet2: {
      url: "https://rpc.test2.btcs.network",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1115,
      gasPrice: 20000000000, // 20 gwei
    },
  },
  etherscan: {
    apiKey: {
      core_testnet2: "your-core-testnet2-api-key" // Replace with actual API key if available
    },
    customChains: [
      {
        network: "core_testnet2",
        chainId: 1115,
        urls: {
          apiURL: "https://api.test2.btcs.network/api",
          browserURL: "https://scan.test2.btcs.network"
        }
      }
    ]
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};
