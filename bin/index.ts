#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { LoanComparisonStack } from "../lib/stack";
import { PipelineStack } from "../lib/pipeline-stack";

const app = new cdk.App();
new LoanComparisonStack(app, "LoanComparisonStack");

new PipelineStack(app, "PipelineStack");
app.synth();
