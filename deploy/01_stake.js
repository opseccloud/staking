module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const opsec = await deployments.get('Opsec');

  await deploy("OpsecStaking", {
    from: deployer,
    proxy: {
      execute: {
        init: {
          methodName: "initialize",
          args: [opsec.address],
        },
      },
      proxyContract: "OpenZeppelinTransparentProxy",
    },
    log: true,
  });
};

module.exports.tags = ["OpsecStaking"];
