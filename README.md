# Opsec Staking

## Overview

Opsec Staking is a Solidity project built with Hardhat, designed for the Ethereum blockchain. It enables users to stake OPSEC tokens to earn rewards over time. The contract includes features like staking, unstaking, extending stake duration, and claiming rewards. It utilizes OpenZeppelin contracts for secure token handling and contract ownership management.

## Features

- Staking OPSEC tokens with a specified duration.
- Ability to extend the duration of an existing stake.
- Unstaking tokens after the staking period has ended.
- Claiming ETH rewards distributed by the contract owner.
- Withdraw functionality for the contract owner to manage staked tokens and contract balances.

## Installation

Before installing, ensure you have Node.js and npm (or Yarn) installed on your system. You'll also need Git to clone the repository.

1. Install dependencies:
```shell
npm install
```

2. Create a `.env` file in the project root and add the following environment variables:
```shell
PRIVATE_KEY=your_wallet_private_key
INFURA_API_KEY=your_infura_api_key
```

3. Compile the contracts:
```shell
npx hardhat compile
```

## Usage

The project includes a set of Hardhat tasks for testing, deploying, and interacting with the contract. You can run these tasks using the `npx hardhat` command.

1. Run the test suite:
```shell
npx hardhat test
```

2. Deploy the contract to a local Hardhat network:
```shell
npx hardhat run scripts/deploy.js --network localhost
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with your proposed changes.

## License

This project is licensed under the MIT License - see the LICENSE file for details.