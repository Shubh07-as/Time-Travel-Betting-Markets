const hre = require("hardhat");

/**
 * Lock.js - Time-locking utilities for Time Travel Betting Markets
 * This script provides utilities for managing time-locked operations
 * including market creation, betting periods, and resolution delays
 */

class TimeLockManager {
  constructor(contract) {
    this.contract = contract;
  }

  /**
   * Create a time-locked market with specific duration and resolution delay
   */
  async createTimeLocked(question, bettingHours, resolveDelayHours) {
    console.log(`Creating time-locked market: "${question}"`);
    console.log(`Betting period: ${bettingHours} hours`);
    console.log(`Resolution delay: ${resolveDelayHours} hours`);
    
    const tx = await this.contract.createMarket(
      question,
      bettingHours,
      resolveDelayHours
    );
    
    const receipt = await tx.wait();
    const marketId = receipt.logs[0].args[0];
    
    console.log(`Market created with ID: ${marketId}`);
    return marketId;
  }

  /**
   * Check if a market is ready for resolution
   */
  async checkResolutionStatus(marketId) {
    const market = await this.contract.getMarket(marketId);
    const currentTime = Math.floor(Date.now() / 1000);
    
    const bettingEnded = currentTime >= market.endTime;
    const readyToResolve = currentTime >= market.resolveTime;
    
    console.log(`Market ${marketId} Status:`);
    console.log(`- Betting Ended: ${bettingEnded}`);
    console.log(`- Ready to Resolve: ${readyToResolve}`);
    console.log(`- Already Resolved: ${market.resolved}`);
    
    return {
      bettingEnded,
      readyToResolve,
      resolved: market.resolved
    };
  }

  /**
   * Get time remaining for market operations
   */
  async getTimeRemaining(marketId) {
    const market = await this.contract.getMarket(marketId);
    const currentTime = Math.floor(Date.now() / 1000);
    
    const bettingTimeLeft = Math.max(0, Number(market.endTime) - currentTime);
    const resolveTimeLeft = Math.max(0, Number(market.resolveTime) - currentTime);
    
    return {
      bettingTimeLeft: this.formatDuration(bettingTimeLeft),
      resolveTimeLeft: this.formatDuration(resolveTimeLeft)
    };
  }

  /**
   * Format duration in seconds to human readable format
   */
  formatDuration(seconds) {
    if (seconds === 0) return "Time's up!";
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    let result = [];
    if (days > 0) result.push(`${days}d`);
    if (hours > 0) result.push(`${hours}h`);
    if (minutes > 0) result.push(`${minutes}m`);
    if (secs > 0) result.push(`${secs}s`);
    
    return result.join(' ');
  }
}

/**
 * Automated Market Creator with predefined time locks
 */
class AutomatedMarketCreator {
  constructor(contract) {
    this.contract = contract;
    this.timeLockManager = new TimeLockManager(contract);
  }

  /**
   * Create short-term markets (hours)
   */
  async createShortTermMarkets() {
    const markets = [
      {
        question: "Will Bitcoin price increase in the next 6 hours?",
        betting: 4,
        resolve: 2
      },
      {
        question: "Will Ethereum gas fees drop below 30 gwei in the next 8 hours?",
        betting: 6,
        resolve: 2
      }
    ];

    console.log("Creating short-term markets...");
    for (const market of markets) {
      await this.timeLockManager.createTimeLocked(
        market.question,
        market.betting,
        market.resolve
      );
      await this.sleep(2000); // Wait 2 seconds between creations
    }
  }

  /**
   * Create medium-term markets (days)
   */
  async createMediumTermMarkets() {
    const markets = [
      {
        question: "Will a major crypto exchange announce a new listing this week?",
        betting: 120, // 5 days
        resolve: 48   // 2 days
      },
      {
        question: "Will any cryptocurrency reach a new all-time high this month?",
        betting: 168, // 1 week
        resolve: 72   // 3 days
      }
    ];

    console.log("Creating medium-term markets...");
    for (const market of markets) {
      await this.timeLockManager.createTimeLocked(
        market.question,
        market.betting,
        market.resolve
      );
      await this.sleep(2000);
    }
  }

  /**
   * Create long-term markets (weeks/months)
   */
  async createLongTermMarkets() {
    const markets = [
      {
        question: "Will Bitcoin reach $150,000 by end of 2025?",
        betting: 720,  // 30 days
        resolve: 168   // 1 week
      },
      {
        question: "Will Ethereum 2.0 staking rewards exceed 8% APY in 2025?",
        betting: 1440, // 60 days
        resolve: 336   // 2 weeks
      }
    ];

    console.log("Creating long-term markets...");
    for (const market of markets) {
      await this.timeLockManager.createTimeLocked(
        market.question,
        market.betting,
        market.resolve
      );
      await this.sleep(2000);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Market Monitor - Continuously monitors market states
 */
class MarketMonitor {
  constructor(contract) {
    this.contract = contract;
    this.timeLockManager = new TimeLockManager(contract);
  }

  /**
   * Monitor all markets and display their status
   */
  async monitorMarkets() {
    try {
      const marketCounter = await this.contract.marketCounter();
      console.log(`\n=== Monitoring ${marketCounter} Markets ===`);
      
      for (let i = 1; i <= marketCounter; i++) {
        await this.displayMarketStatus(i);
      }
    } catch (error) {
      console.error("Error monitoring markets:", error.message);
    }
  }

  /**
   * Display detailed status for a specific market
   */
  async displayMarketStatus(marketId) {
    try {
      const market = await this.contract.getMarket(marketId);
      const timeRemaining = await this.timeLockManager.getTimeRemaining(marketId);
      const status = await this.timeLockManager.checkResolutionStatus(marketId);
      
      console.log(`\n--- Market ${marketId} ---`);
      console.log(`Question: ${market.question}`);
      console.log(`Total YES Bets: ${hre.ethers.formatEther(market.totalYesBets)} ETH`);
      console.log(`Total NO Bets: ${hre.ethers.formatEther(market.totalNoBets)} ETH`);
      console.log(`Betting Time Left: ${timeRemaining.bettingTimeLeft}`);
      console.log(`Resolution Time Left: ${timeRemaining.resolveTimeLeft}`);
      console.log(`Status: ${this.getMarketStatusText(status)}`);
      
      if (market.resolved) {
        console.log(`Outcome: ${market.outcome ? 'YES' : 'NO'}`);
      }
    } catch (error) {
      console.error(`Error displaying market ${marketId}:`, error.message);
    }
  }

  /**
   * Get human-readable market status
   */
  getMarketStatusText(status) {
    if (status.resolved) return "✅ RESOLVED";
    if (status.readyToResolve) return "⏰ READY TO RESOLVE";
    if (status.bettingEnded) return "🔒 BETTING ENDED";
    return "🟢 BETTING OPEN";
  }

  /**
   * Start continuous monitoring (every 30 seconds)
   */
  async startContinuousMonitoring() {
    console.log("Starting continuous market monitoring...");
    console.log("Press Ctrl+C to stop monitoring\n");

    const monitor = async () => {
      await this.monitorMarkets();
      setTimeout(monitor, 30000); // Monitor every 30 seconds
    };

    await monitor();
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log("Time Travel Betting Markets - Lock Manager");
  console.log("==========================================");

  // Get contract instance
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("Please set CONTRACT_ADDRESS in your .env file");
    process.exit(1);
  }

  const [signer] = await hre.ethers.getSigners();
  const Project = await hre.ethers.getContractFactory("Project");
  const contract = Project.attach(contractAddress).connect(signer);

  console.log(`Connected to contract at: ${contractAddress}`);
  console.log(`Using account: ${signer.address}\n`);

  // Parse command line arguments
  const command = process.argv[2];

  switch (command) {
    case "create-short":
      const shortCreator = new AutomatedMarketCreator(contract);
      await shortCreator.createShortTermMarkets();
      break;

    case "create-medium":
      const mediumCreator = new AutomatedMarketCreator(contract);
      await mediumCreator.createMediumTermMarkets();
      break;

    case "create-long":
      const longCreator = new AutomatedMarketCreator(contract);
      await longCreator.createLongTermMarkets();
      break;

    case "create-all":
      const allCreator = new AutomatedMarketCreator(contract);
      await allCreator.createShortTermMarkets();
      await allCreator.createMediumTermMarkets();
      await allCreator.createLongTermMarkets();
      break;

    case "monitor":
      const monitor = new MarketMonitor(contract);
      await monitor.monitorMarkets();
      break;

    case "watch":
      const watcher = new MarketMonitor(contract);
      await watcher.startContinuousMonitoring();
      break;

    case "status":
      const marketId = process.argv[3];
      if (!marketId) {
        console.error("Please provide a market ID: npm run lock status <marketId>");
        process.exit(1);
      }
      const statusMonitor = new MarketMonitor(contract);
      await statusMonitor.displayMarketStatus(parseInt(marketId));
      break;

    case "check":
      const checkId = process.argv[3];
      if (!checkId) {
        console.error("Please provide a market ID: npm run lock check <marketId>");
        process.exit(1);
      }
      const timeLockManager = new TimeLockManager(contract);
      await timeLockManager.checkResolutionStatus(parseInt(checkId));
      break;

    default:
      console.log("Available commands:");
      console.log("  create-short  - Create short-term markets (hours)");
      console.log("  create-medium - Create medium-term markets (days)");
      console.log("  create-long   - Create long-term markets (weeks/months)");
      console.log("  create-all    - Create all types of markets");
      console.log("  monitor       - Monitor all markets once");
      console.log("  watch         - Continuously monitor markets");
      console.log("  status <id>   - Show status of specific market");
      console.log("  check <id>    - Check resolution status of market");
      console.log("\nExample usage:");
      console.log("  npm run lock create-short");
      console.log("  npm run lock monitor");
      console.log("  npm run lock status 1");
      break;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down lock manager...');
  process.exit(0);
});

if (require.main === module) {
  main().catch((error) => {
    console.error("Lock manager error:", error);
    process.exit(1);
  });
}

module.exports = {
  TimeLockManager,
  AutomatedMarketCreator,
  MarketMonitor
};
