pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// @title Simple Staking Contract for ERC20 tokens.
// @notice Use this contract to stake a specific ERC20 token.
// @dev Separating staking contract from ERC20 token allows you to separate
//      state from staking implementation.
contract SimpleStakingContract is Ownable {
    // @notice Address of ERC20 token being staked.
    IERC20 private token;
    // @notice Reward per token.
    uint256 private rewardPerBlock;
    // @notice Total reward accumulated per share in the staking pool.
    //         Note this accumulates indefinitely. Use in conjunction with
    //         rewardDebt to calculate user rewards.
    uint256 private accRewardPerShare;
    // @notice Last time block rewards were updated.
    uint256 private lastBlockTime;
    // @notice Total amount of tokens staked.
    uint256 private totalStakedSupply;

    // @notice Precision of ERC20 token.
    uint256 private tokenPrecision;

    // @notice Info on each staking user.
    // `amount` Amount of tokens staked.
    // `rewardDebt` Total amount of tokens owing. See section on accRewardPerShare.
    struct UserInfo {
        uint256 amount;
        int256 rewardDebt;
    }

    // @notice Info on each staking user.
    mapping (address => UserInfo) private userInfo;

    event Claim(address to, uint256 reward);
    event Stake(address to, uint256 amount);
    event Withdraw(address to, uint256 amount);
    event LogSetStakingReward(uint256 reward);

    constructor (uint256 reward) {
        rewardPerBlock = reward;
        accRewardPerShare = 0;
        lastBlockTime = block.number;
        totalStakedSupply = 0;
    }

    // @notice Set the contract of the token being staked.
    // @params addr Address of token being staked.
    // @params decimals Decimals of the token.
    function setTokenContractAddress(IERC20 addr, uint8 decimals) public onlyOwner {
        token = addr;
        tokenPrecision = 10 ** decimals;
    }

    // @notice Set staking reward per block.
    // @params reward Amount of tokens to be distributed per block.
    function setStakingReward(uint256 reward) public onlyOwner {
        update();
        rewardPerBlock = reward;
        emit LogSetStakingReward(reward);
    }

    // @notice Deposit tokens for staking.
    // @param amount The amount of tokens to deposit for staking.
    function deposit(uint256 amount) public {
        update();
        userInfo[msg.sender].amount += amount;
        userInfo[msg.sender].rewardDebt += int256(accRewardPerShare * amount / tokenPrecision);

        totalStakedSupply += amount;
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success);

        emit Stake(msg.sender, amount);
    }

    // @notice Unstake and withdraw tokens.
    // @params amount Amount of tokens to withdraw.
    function withdraw(uint256 amount) public {
        require(userInfo[msg.sender].amount > amount, "Cannot withdraw more than you have staked.");
        update();
        userInfo[msg.sender].amount -= amount;
        totalStakedSupply -= amount;

        bool success = token.transfer(msg.sender, amount);
        require(success);

        emit Withdraw(msg.sender, amount);
    }

    // @notice Claim staking rewards.
    function claim() public {
        update();
        int256 total = int256(accRewardPerShare * userInfo[msg.sender].amount / tokenPrecision);
        uint256 reward = uint256(total - userInfo[msg.sender].rewardDebt);
        userInfo[msg.sender].rewardDebt += int256(reward);

        bool success = token.transfer(msg.sender, reward);
        require(success);

        emit Claim(msg.sender, reward);
    }

    // @notice Update rewards owed to users.
    // @dev Update accRewardPerShare to reflect changes in staking reward and staked supply.
    function update() private {
        if (totalStakedSupply > 0) {
            uint256 blockCount = block.number - lastBlockTime;
            uint256 totalReward = blockCount * rewardPerBlock;
            accRewardPerShare += totalReward * tokenPrecision / totalStakedSupply;
        }
        lastBlockTime = block.number;
    }

    // @notice Fetch amount of tokens staked by a given user.
    // @params staker Address of user whose balance are being checked.
    // @returns Amount of tokens being staked by user.
    function balanceOf(address staker) public view returns (uint256) {
        return userInfo[staker].amount;
    }

    // @notice Fetch amount of rewards pending for a given user.
    // @params staker Address of user whose rewards are being checked.
    // @returns Amount of rewards pending for the user.
    function pendingRewards(address staker) public view returns (uint256) {
        uint256 blockCount = block.number - lastBlockTime;
        uint256 _accRewardPerShare = accRewardPerShare;
        uint256 amount = userInfo[staker].amount;
        int256 rewardDebt = userInfo[staker].rewardDebt;

        if (block.number > lastBlockTime && totalStakedSupply != 0) {
            uint256 totalReward = blockCount * rewardPerBlock;
            _accRewardPerShare += totalReward * tokenPrecision / totalStakedSupply;
        }

        return uint256(int256(amount * _accRewardPerShare / tokenPrecision) - rewardDebt);
    }
}
