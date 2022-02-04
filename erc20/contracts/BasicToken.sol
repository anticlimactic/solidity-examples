pragma solidity ^0.8.0;

import "./ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Custom ERC20 contract implemented for testing purposes.
 *
 * Supports minting and burning tokens.
 */
contract BasicToken is ERC20, Ownable {
    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(
        name_, symbol_, decimals_
    ) {}

    // @notice Mints tokens.
    // @param receiver Address to mint tokens to.
    // @param value Amount of tokens to mint.
    function mint(address receiver, uint256 value) public onlyOwner {
        _mint(receiver, value);
    }

    // @notice Burns tokens.
    // @param value Amount of tokens to burn.
    function burn(uint256 value) public {
        _burn(value);
    }
}
