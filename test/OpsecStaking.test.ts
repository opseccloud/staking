import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

import { Opsec, OpsecStaking } from "../typechain";

describe("OpsecStaking", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployStakeFixture() {
    const ONE_DAY_IN_SECS = 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const duration = 7 * ONE_DAY_IN_SECS; // 7 days
    const stakeAmount = ONE_GWEI;
    const stakeId = ethers.randomBytes(32);

    // Contracts are deployed using the first signer/account by default
    const [owner, user0] = await ethers.getSigners();

    const Opsec = await ethers.getContractFactory("Opsec");
    const opsec = (await Opsec.deploy()) as Opsec;
    await opsec.waitForDeployment();

    const OpsecStakingFactory = await ethers.getContractFactory("OpsecStaking");
    const opsecStaking = (await upgrades.deployProxy(
      OpsecStakingFactory,
      [opsec.target],
      { initializer: "initialize" },
    )) as unknown as OpsecStaking;
    await opsecStaking.waitForDeployment();

    // Approve opsec to stake
    await opsec.approve(opsecStaking.target, stakeAmount);

    return {
      opsecStaking,
      opsec,
      owner,
      user0,
      stakeAmount,
      duration,
      stakeId,
    };
  }

  async function stakeWithOneWeekAndOneGweiFixture() {
    const {
      opsecStaking,
      opsec,
      owner,
      user0,
      stakeAmount,
      duration,
      stakeId,
    } = await deployStakeFixture();

    await opsecStaking.stake(stakeId, stakeAmount, duration);

    return {
      opsecStaking,
      opsec,
      owner,
      user0,
      stakeAmount,
      duration,
      stakeId,
    };
  }

  describe("Deployment", function () {
    it("Should set the right token", async function () {
      const { opsecStaking, opsec } = await loadFixture(deployStakeFixture);

      expect(await opsecStaking.opsec()).to.equal(opsec.target);
    });
  });

  describe("Staking", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called with zero amount", async function () {
        const { opsecStaking, duration, stakeId } =
          await loadFixture(deployStakeFixture);

        await expect(
          opsecStaking.stake(stakeId, 0, duration),
        ).to.be.revertedWith("Amount must be greater than 0");
      });

      it("Should revert with the right error if the stakedId is used", async function () {
        const { opsecStaking, stakeAmount, duration, stakeId } =
          await loadFixture(stakeWithOneWeekAndOneGweiFixture);

        await expect(
          opsecStaking.stake(stakeId, stakeAmount, duration),
        ).to.be.revertedWith("The stakeId is already used");
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        const { opsecStaking, stakeAmount, duration, stakeId } =
          await loadFixture(deployStakeFixture);

        await expect(opsecStaking.stake(stakeId, stakeAmount, duration)).not.to
          .be.reverted;
      });
    });

    describe("Events", function () {
      it("Should emit an event on stake", async function () {
        const { opsecStaking, owner, stakeAmount, duration, stakeId } =
          await loadFixture(deployStakeFixture);

        await time.increase(duration);

        await expect(opsecStaking.stake(stakeId, stakeAmount, duration))
          .to.emit(opsecStaking, "Staked")
          .withArgs(stakeId, owner.address, stakeAmount, duration, anyValue); // We accept any value as `when` arg
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        const { opsecStaking, opsec, owner, stakeAmount, duration, stakeId } =
          await loadFixture(deployStakeFixture);

        await expect(
          opsecStaking.stake(stakeId, stakeAmount, duration),
        ).to.changeTokenBalances(
          opsec,
          [owner, opsecStaking],
          [-stakeAmount, stakeAmount],
        );
      });
    });
  });

  describe("extendUnlockTime", function () {
    describe("Validations", function () {
      it("should revert with right error if the duration is zero", async function () {
        const { opsecStaking, stakeId } = await loadFixture(
          stakeWithOneWeekAndOneGweiFixture,
        );

        await expect(
          opsecStaking.extendUnlockTime(stakeId, 0),
        ).to.be.revertedWith("Amount must be greater than 0");
      });

      it("should revert with right error if the caller is not staker", async function () {
        const { opsecStaking, user0, stakeId } = await loadFixture(
          stakeWithOneWeekAndOneGweiFixture,
        );

        const duration = 7 * 24 * 60 * 60; // 7 days
        await expect(
          opsecStaking.connect(user0).extendUnlockTime(stakeId, duration),
        ).to.be.revertedWith("You are not the staker");
      });

      it("should revert with right error if the stake is expired", async function () {
        const { opsecStaking, duration, stakeId } = await loadFixture(
          stakeWithOneWeekAndOneGweiFixture,
        );

        await time.increase(duration);

        const newDuration = 7 * 24 * 60 * 60; // 7 days
        await expect(
          opsecStaking.extendUnlockTime(stakeId, newDuration),
        ).to.be.revertedWith("The stake is expired");
      });
    });

    describe("Events", function () {
      it("should emit an event on extendUnlockTime", async function () {
        const { opsecStaking, stakeId } = await loadFixture(
          stakeWithOneWeekAndOneGweiFixture,
        );

        const newDuration = 7 * 24 * 60 * 60; // 7 days
        await expect(opsecStaking.extendUnlockTime(stakeId, newDuration))
          .to.emit(opsecStaking, "Extended")
          .withArgs(stakeId, newDuration);
      });
    });
  });

  describe("Unstaking", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called before the stake", async function () {
        const { opsecStaking } = await loadFixture(deployStakeFixture);

        await expect(
          opsecStaking.unstake(ethers.randomBytes(32)),
        ).to.be.revertedWith("You are not the staker");
      });

      it("Should revert with the right error if you unstaked", async function () {
        const { opsecStaking, duration, stakeId } = await loadFixture(
          stakeWithOneWeekAndOneGweiFixture,
        );

        await time.increase(duration);
        await opsecStaking.unstake(stakeId);

        await expect(opsecStaking.unstake(stakeId)).to.be.revertedWith(
          "You already unstaked",
        );
      });

      it("Should revert with the right error if called too soon", async function () {
        const { opsecStaking, stakeId } = await loadFixture(
          stakeWithOneWeekAndOneGweiFixture,
        );

        await expect(opsecStaking.unstake(stakeId)).to.be.revertedWith(
          "The stake is still locked",
        );
      });

      it("Should revert with the right error if called too soon", async function () {
        const { opsecStaking, stakeId } = await loadFixture(
          stakeWithOneWeekAndOneGweiFixture,
        );

        await expect(opsecStaking.unstake(stakeId)).to.be.revertedWith(
          "The stake is still locked",
        );
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        const { opsecStaking, duration, stakeId } = await loadFixture(
          stakeWithOneWeekAndOneGweiFixture,
        );

        await time.increase(duration);

        await expect(opsecStaking.unstake(stakeId)).not.to.be.reverted;
      });
    });

    describe("Events", function () {
      it("Should emit an event on unstake", async function () {
        const { opsecStaking, owner, stakeAmount, duration, stakeId } =
          await loadFixture(stakeWithOneWeekAndOneGweiFixture);

        await time.increase(duration);

        await expect(opsecStaking.unstake(stakeId))
          .to.emit(opsecStaking, "Unstaked")
          .withArgs(stakeId, owner.address, stakeAmount, anyValue); // We accept any value as `when` arg
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        const { opsecStaking, opsec, owner, stakeAmount, duration, stakeId } =
          await loadFixture(stakeWithOneWeekAndOneGweiFixture);

        await time.increase(duration);

        await expect(opsecStaking.unstake(stakeId)).to.changeTokenBalances(
          opsec,
          [owner, opsecStaking],
          [stakeAmount, -stakeAmount],
        );
      });
    });
  });
});
