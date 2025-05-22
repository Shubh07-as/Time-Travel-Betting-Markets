// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Time Travel Betting Markets
 * @dev A decentralized prediction market with time-locked betting mechanisms
 */
contract Project is ReentrancyGuard, Ownable {
    
    struct Market {
        uint256 id;
        string question;
        uint256 endTime;
        uint256 resolveTime;
        bool resolved;
        bool outcome;
        uint256 totalYesBets;
        uint256 totalNoBets;
        mapping(address => uint256) yesBets;
        mapping(address => uint256) noBets;
        mapping(address => bool) claimed;
    }
    
    struct TimeCapture {
        uint256 timestamp;
        uint256 blockNumber;
        bytes32 blockHash;
        string eventDescription;
    }
    
    mapping(uint256 => Market) public markets;
    mapping(uint256 => TimeCapture) public timeCaptures;
    uint256 public marketCounter;
    uint256 public timeCaptureCounter;
    
    uint256 public constant MIN_BET = 0.001 ether;
    uint256 public constant PLATFORM_FEE = 200; // 2%
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    event MarketCreated(uint256 indexed marketId, string question, uint256 endTime, uint256 resolveTime);
    event BetPlaced(uint256 indexed marketId, address indexed bettor, bool prediction, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed winner, uint256 amount);
    event TimeCaptured(uint256 indexed captureId, uint256 timestamp, string eventDescription);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Core Function 1: Create a new prediction market
     * @param _question The question to be predicted
     * @param _durationHours How many hours the market stays open for betting
     * @param _resolveDelayHours Hours after market closes before it can be resolved
     */
    function createMarket(
        string memory _question,
        uint256 _durationHours,
        uint256 _resolveDelayHours
    ) external onlyOwner returns (uint256) {
        require(_durationHours > 0 && _durationHours <= 8760, "Invalid duration"); // Max 1 year
        require(_resolveDelayHours > 0 && _resolveDelayHours <= 720, "Invalid resolve delay"); // Max 30 days
        
        marketCounter++;
        uint256 marketId = marketCounter;
        
        Market storage newMarket = markets[marketId];
        newMarket.id = marketId;
        newMarket.question = _question;
        newMarket.endTime = block.timestamp + (_durationHours * 1 hours);
        newMarket.resolveTime = newMarket.endTime + (_resolveDelayHours * 1 hours);
        newMarket.resolved = false;
        
        emit MarketCreated(marketId, _question, newMarket.endTime, newMarket.resolveTime);
        return marketId;
    }
    
    /**
     * @dev Core Function 2: Place a bet on a market outcome
     * @param _marketId The ID of the market to bet on
     * @param _prediction True for YES, False for NO
     */
    function placeBet(uint256 _marketId, bool _prediction) external payable nonReentrant {
        require(msg.value >= MIN_BET, "Bet amount too small");
        require(_marketId > 0 && _marketId <= marketCounter, "Invalid market ID");
        
        Market storage market = markets[_marketId];
        require(block.timestamp < market.endTime, "Market closed for betting");
        require(!market.resolved, "Market already resolved");
        
        if (_prediction) {
            market.yesBets[msg.sender] += msg.value;
            market.totalYesBets += msg.value;
        } else {
            market.noBets[msg.sender] += msg.value;
            market.totalNoBets += msg.value;
        }
        
        emit BetPlaced(_marketId, msg.sender, _prediction, msg.value);
    }
    
    /**
     * @dev Core Function 3: Resolve market and capture time state
     * @param _marketId The ID of the market to resolve
     * @param _outcome The actual outcome (true for YES, false for NO)
     * @param _eventDescription Description of the resolution event
     */
    function resolveMarket(
        uint256 _marketId, 
        bool _outcome, 
        string memory _eventDescription
    ) external onlyOwner {
        require(_marketId > 0 && _marketId <= marketCounter, "Invalid market ID");
        
        Market storage market = markets[_marketId];
        require(!market.resolved, "Market already resolved");
        require(block.timestamp >= market.resolveTime, "Too early to resolve");
        
        // Capture time state for historical reference
        timeCaptureCounter++;
        TimeCapture storage capture = timeCaptures[timeCaptureCounter];
        capture.timestamp = block.timestamp;
        capture.blockNumber = block.number;
        capture.blockHash = blockhash(block.number - 1);
        capture.eventDescription = _eventDescription;
        
        market.resolved = true;
        market.outcome = _outcome;
        
        emit MarketResolved(_marketId, _outcome);
        emit TimeCaptured(timeCaptureCounter, block.timestamp, _eventDescription);
    }
    
    /**
     * @dev Claim winnings from a resolved market
     * @param _marketId The ID of the resolved market
     */
    function claimWinnings(uint256 _marketId) external nonReentrant {
        require(_marketId > 0 && _marketId <= marketCounter, "Invalid market ID");
        
        Market storage market = markets[_marketId];
        require(market.resolved, "Market not resolved yet");
        require(!market.claimed[msg.sender], "Already claimed");
        
        uint256 userBet;
        uint256 totalWinningBets;
        uint256 totalLosingBets;
        
        if (market.outcome) {
            // YES won
            userBet = market.yesBets[msg.sender];
            totalWinningBets = market.totalYesBets;
            totalLosingBets = market.totalNoBets;
        } else {
            // NO won
            userBet = market.noBets[msg.sender];
            totalWinningBets = market.totalNoBets;
            totalLosingBets = market.totalYesBets;
        }
        
        require(userBet > 0, "No winning bet found");
        
        // Calculate winnings: original bet + proportional share of losing bets
        uint256 winningsFromLosingBets = (userBet * totalLosingBets) / totalWinningBets;
        uint256 totalWinnings = userBet + winningsFromLosingBets;
        
        // Deduct platform fee from winnings (not from original bet)
        uint256 fee = (winningsFromLosingBets * PLATFORM_FEE) / FEE_DENOMINATOR;
        uint256 netWinnings = totalWinnings - fee;
        
        market.claimed[msg.sender] = true;
        
        payable(msg.sender).transfer(netWinnings);
        emit WinningsClaimed(_marketId, msg.sender, netWinnings);
    }
    
    /**
     * @dev Get market details
     */
    function getMarket(uint256 _marketId) external view returns (
        string memory question,
        uint256 endTime,
        uint256 resolveTime,
        bool resolved,
        bool outcome,
        uint256 totalYesBets,
        uint256 totalNoBets
    ) {
        Market storage market = markets[_marketId];
        return (
            market.question,
            market.endTime,
            market.resolveTime,
            market.resolved,
            market.outcome,
            market.totalYesBets,
            market.totalNoBets
        );
    }
    
    /**
     * @dev Get user's bets on a market
     */
    function getUserBets(uint256 _marketId, address _user) external view returns (
        uint256 yesBet,
        uint256 noBet,
        bool claimed
    ) {
        Market storage market = markets[_marketId];
        return (
            market.yesBets[_user],
            market.noBets[_user],
            market.claimed[_user]
        );
    }
    
    /**
     * @dev Withdraw platform fees (only owner)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Get time capture details
     */
    function getTimeCapture(uint256 _captureId) external view returns (
        uint256 timestamp,
        uint256 blockNumber,
        bytes32 blockHash,
        string memory eventDescription
    ) {
        TimeCapture storage capture = timeCaptures[_captureId];
        return (
            capture.timestamp,
            capture.blockNumber,
            capture.blockHash,
            capture.eventDescription
        );
    }
}
