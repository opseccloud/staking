// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Opsec is ERC20 {
    constructor() ERC20("OPSEC_MOCK", "OPSEC_MOCK") {
        _mint(msg.sender, 1000000 * 10 ** 18);
    }

    function mint(address account, uint256 value) external {
        _mint(account, value);
    }
}
