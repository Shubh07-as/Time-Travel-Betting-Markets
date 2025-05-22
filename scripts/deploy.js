const hre = require("hardhat");

async function main() {
  console.log("Deploying Time Travel Betting Markets to Core Testnet 2...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy the Project contract
  const Project = await hre.ethers.getContractFactory("Project");
  const project = await Project.deploy();

  await project.waitForDeployment();

  const projectAddress = await project.getAddress();
  console.log("Time Travel Betting Markets deployed to:", projectAddress);

  // Verify the contract on Core Testnet 2 explorer (if verification is supported)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await project.deploymentTransaction().wait(5);
    
    try {
      await hre.run("verify:verify", {
        address: projectAddress,
        constructorArguments: [],
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.log("Contract verification failed:", error.message);
    }
  }

  // Create a sample market for testing
  console.log("\nCreating a sample market...");
  try {
    const createTx = await project.createMarket(
      "Will Bitcoin price exceed $100,000 by end of 2025?",
      24, // 24 hours betting period
      1   // 1 hour resolve delay
    );
    await createTx.wait();
    console.log("Sample market created successfully!");
    
    // Get market details
    const marketDetails = await project.getMarket(1);
    console.log("Market Question:", marketDetails[0]);
    console.log("Market End Time:", new Date(Number(marketDetails[1]) * 1000).toISOString());
    console.log("Resolve Time:", new Date(Number(marketDetails[2]) * 1000).toISOString());
    
  } catch (error) {
    console.log("Failed to create sample market:", error.message);
  }

  console.log("\n=== Deployment Summary ===");
  console.log("Network:", hre.network.name);
  console.log("Contract Address:", projectAddress);
  console.log("Deployer:", deployer.address);
  console.log("Gas Used: Check transaction details on Core Testnet 2 explorer");
  console.log("Explorer URL: https://scan.test2.btcs.network/address/" + projectAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
