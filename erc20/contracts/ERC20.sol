pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @dev Implementation of ERC20 interface as defined by the EIP.
 *
 * Total supply is a monotonically increasing function.
 * Burnt tokens go to the zero address.
 */
contract ERC20 is IERC20, IERC20Metadata {

    string private _name;
    string private _symbol;
    uint8 private _decimals;

    // @notice Total supply of tokens. Cannot decrease in value.
    uint256 private _totalSupply;
    // @notice Map of user balances.
    mapping (address => uint256) private _balances;
    // @notice Map of user approvals.
    mapping (address => mapping (address => uint256)) private approvals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
    }

    function name() external view override returns (string memory) {
        return _name;
    }

    function symbol() external view override returns (string memory) {
        return _symbol;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    // @notice Fetches total supply of tokens available.
    // @return Total supply of tokens.
    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    // @notice Fetches balance of a user.
    // @param owner Address of user that is being queried.
    // @return balance Amount of tokens owned by user.
    function balanceOf(address owner) public view override returns (uint256 balance) {
        return _balances[owner];
    }

    // @notice Transfer tokens from oneself to another.
    // @param to Address to transfer tokens to.
    // @param value Amount of tokens to transfer.
    // @return success True or false representing whether the transfer was successful or not.
    function transfer(address to, uint256 value) public override returns (bool success) {
        require(to != address(0), "ERC20: Cannot transfer to zero address.");
        require(to != address(this), "ERC20: Cannot send token to token contract.");
        require(_balances[msg.sender] >= value, "ERC20: Insufficient balance to transfer.");

        _balances[msg.sender] -= value;
        _balances[to] += value;

        emit Transfer(msg.sender, to, value);
        return true;
    }

    // @notice Transfer tokens on behalf of another user.
    // @param from User tokens are being transferred from.
    // @param to User tokens are being transferred to.
    // @param value Amount of tokens being transferred.
    // @return success True or false representing whether the transfer was successful or not.
    function transferFrom(address from, address to, uint256 value) public override returns (bool success) {
        require(to != address(0), "ERC20: Cannot transfer to zero address.");
        require(to != address(this), "ERC20: Cannot send token to token contract.");
        require(approvals[from][msg.sender] >= value, "ERC20: Insufficient funds approved for transfer.");

        approvals[from][msg.sender] -= value;
        _balances[from] -= value;
        _balances[to] += value;

        emit Transfer(from, to, value);
        return true;
    }

    // @notice Approve another user to transfer tokens on your behalf.
    // @param spender Other user that you are approving to transfer tokens.
    // @param value Amount of tokens other user is allowed to transfer.
    // @return success True or false representing whether the approval was succesful or not.
    function approve(address spender, uint256 value) public override returns (bool success) {
        approvals[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    // @notice Check amount of tokens a user is allowed to transfer on another user's behalf.
    // @param owner Owner of the tokens that have been approved.
    // @param spender User who has been granted the ability to transfer owner's tokens.
    // @returns Amount of tokens spender is allowed to transfer on behalf of owner.
    function allowance(address owner, address spender) external view override returns (uint256) {
        return approvals[owner][spender];
    }

    // @notice Helper function to mint tokens.
    // @param receiver User to mint tokens to.
    // @param value Amount of tokens to mint.
    function _mint(address receiver, uint256 value) internal virtual {
        require(receiver != address(0), "ERC20: Mint to zero address.");

        _totalSupply += value;
        _balances[receiver] += value;

        emit Transfer(address(0), receiver, value);
    }

    // @notice Helper function to burn tokens.
    // @param value Amount of tokens to burn.
    function _burn(uint256 value) internal virtual {
        require(_balances[msg.sender] >= value, "ERC20: Insufficient balance to burn.");

        _balances[msg.sender] -= value;
        _balances[address(0)] += value;

        emit Transfer(msg.sender, address(0), value);
    }
}
