import { App, type Environment } from "aws-cdk-lib";
import { VpcStack } from "../lib/vpc-stack";
import { WorkerdStack } from "../lib/worderd-stack";

const app = new App();
const env: Environment = {
	account: "357768690085",
	region: "eu-west-3",
};

const vpc = new VpcStack(app, "Vpc", {
	env: env,
	vpcProps: {
		cidr: "10.0.0.0/16",
		maxAzs: 2,
		natGateways: 1,
		useFckNatProvider: true,
		vpcName: "workerd-vpc",
	},
});
new WorkerdStack(app, "Workerd", {
	env: env,
	vpc: vpc.vpc,
});
