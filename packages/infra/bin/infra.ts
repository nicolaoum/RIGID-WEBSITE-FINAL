#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RigidInfraStack } from '../lib/rigid-infra-stack';

const app = new cdk.App();

new RigidInfraStack(app, 'RigidInfraStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Rigid Residential Web App Infrastructure',
});

app.synth();
