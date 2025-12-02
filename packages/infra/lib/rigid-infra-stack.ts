import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export class RigidInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // Configuration - Update these values!
    // ========================================
    const existingUserPoolId = process.env.COGNITO_USER_POOL_ID || 'us-east-1_0jpfXq1IU';
    const existingUserPoolClientId = process.env.COGNITO_CLIENT_ID || '205455frahsacolm9geoe3khc6';

    // Import existing Cognito User Pool
    const userPool = cognito.UserPool.fromUserPoolId(
      this,
      'ExistingUserPool',
      existingUserPoolId
    );

    // ========================================
    // DynamoDB Tables
    // ========================================
    
    // Buildings Table
    const buildingsTable = new dynamodb.Table(this, 'BuildingsTable', {
      tableName: 'rigid-buildings',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // Units Table
    const unitsTable = new dynamodb.Table(this, 'UnitsTable', {
      tableName: 'rigid-units',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // Add GSI for querying units by building
    unitsTable.addGlobalSecondaryIndex({
      indexName: 'buildingId-index',
      partitionKey: { name: 'buildingId', type: dynamodb.AttributeType.STRING },
    });

    // Tickets Table
    const ticketsTable = new dynamodb.Table(this, 'TicketsTable', {
      tableName: 'rigid-tickets',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // Add GSI for querying tickets by user
    ticketsTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Notices Table
    const noticesTable = new dynamodb.Table(this, 'NoticesTable', {
      tableName: 'rigid-notices',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // ========================================
    // S3 Bucket for Images
    // ========================================
    const imagesBucket = new s3.Bucket(this, 'ImagesBucket', {
      bucketName: `rigid-images-${this.account}`,
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // ========================================
    // Lambda Environment Variables
    // ========================================
    const lambdaEnvironment = {
      BUILDINGS_TABLE: buildingsTable.tableName,
      UNITS_TABLE: unitsTable.tableName,
      TICKETS_TABLE: ticketsTable.tableName,
      NOTICES_TABLE: noticesTable.tableName,
      IMAGES_BUCKET: imagesBucket.bucketName,
      NODE_ENV: 'production',
    };

    // ========================================
    // Lambda Functions
    // ========================================
    const lambdaPath = path.join(__dirname, '../../lambdas/dist');

    // GET /units
    const getUnitsLambda = new lambda.Function(this, 'GetUnitsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getUnits.handler',
      code: lambda.Code.fromAsset(lambdaPath),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    unitsTable.grantReadWriteData(getUnitsLambda);

    // POST /units (staff only)
    const postUnitLambda = new lambda.Function(this, 'PostUnitFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'postUnit.handler',
      code: lambda.Code.fromAsset(lambdaPath),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    unitsTable.grantReadWriteData(postUnitLambda);

    // DELETE /units/{id} (staff only)
    const deleteUnitLambda = new lambda.Function(this, 'DeleteUnitFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'deleteUnit.handler',
      code: lambda.Code.fromAsset(lambdaPath),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    unitsTable.grantReadWriteData(deleteUnitLambda);

    // GET /buildings
    const getBuildingsLambda = new lambda.Function(this, 'GetBuildingsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getBuildings.handler',
      code: lambda.Code.fromAsset(lambdaPath),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    buildingsTable.grantReadData(getBuildingsLambda);

    // POST /inquiries
    const postInquiryLambda = new lambda.Function(this, 'PostInquiryFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'postInquiry.handler',
      code: lambda.Code.fromAsset(lambdaPath),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // GET /tickets (authenticated)
    const getTicketsLambda = new lambda.Function(this, 'GetTicketsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getTickets.handler',
      code: lambda.Code.fromAsset(lambdaPath),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    ticketsTable.grantReadData(getTicketsLambda);

    // GET /tickets/all (staff only - authenticated)
    const getAllTicketsLambda = new lambda.Function(this, 'GetAllTicketsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getAllTickets.handler',
      code: lambda.Code.fromAsset(lambdaPath),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    ticketsTable.grantReadData(getAllTicketsLambda);

    // POST /tickets (authenticated)
    const postTicketLambda = new lambda.Function(this, 'PostTicketFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'postTicket.handler',
      code: lambda.Code.fromAsset(lambdaPath),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    ticketsTable.grantReadWriteData(postTicketLambda);

    // PUT /tickets/{ticketId}/status (staff only - authenticated)
    const updateTicketStatusLambda = new lambda.Function(this, 'UpdateTicketStatusFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'updateTicketStatus.handler',
      code: lambda.Code.fromAsset(lambdaPath),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    ticketsTable.grantReadWriteData(updateTicketStatusLambda);

    // GET /notices (authenticated)
    const getNoticesLambda = new lambda.Function(this, 'GetNoticesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getNotices.handler',
      code: lambda.Code.fromAsset(lambdaPath),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    noticesTable.grantReadData(getNoticesLambda);

    // POST /upload-url (for S3 image uploads)
    const getUploadUrlLambda = new lambda.Function(this, 'GetUploadUrlFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getUploadUrl.handler',
      code: lambda.Code.fromAsset(lambdaPath),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });
    imagesBucket.grantPut(getUploadUrlLambda);
    imagesBucket.grantPutAcl(getUploadUrlLambda);

    // ========================================
    // API Gateway
    // ========================================
    const api = new apigateway.RestApi(this, 'RigidApi', {
      restApiName: 'Rigid Residential API',
      description: 'API for Rigid Residential web application',
      deployOptions: {
        stageName: 'prod',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: 'RigidCognitoAuthorizer',
      identitySource: 'method.request.header.Authorization',
    });

    // ========================================
    // Public Endpoints (no auth required)
    // ========================================
    const unitsResource = api.root.addResource('units');
    unitsResource.addMethod('GET', new apigateway.LambdaIntegration(getUnitsLambda));
    unitsResource.addMethod('POST', new apigateway.LambdaIntegration(postUnitLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    const unitResource = unitsResource.addResource('{id}');
    unitResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteUnitLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const buildingsResource = api.root.addResource('buildings');
    buildingsResource.addMethod('GET', new apigateway.LambdaIntegration(getBuildingsLambda));

    const inquiriesResource = api.root.addResource('inquiries');
    inquiriesResource.addMethod('POST', new apigateway.LambdaIntegration(postInquiryLambda));

    const uploadUrlResource = api.root.addResource('upload-url');
    uploadUrlResource.addMethod('POST', new apigateway.LambdaIntegration(getUploadUrlLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // ========================================
    // Protected Endpoints (authentication required)
    // ========================================
    const ticketsResource = api.root.addResource('tickets');
    ticketsResource.addMethod('GET', new apigateway.LambdaIntegration(getTicketsLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    ticketsResource.addMethod('POST', new apigateway.LambdaIntegration(postTicketLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /tickets/all (staff only)
    const ticketsAllResource = ticketsResource.addResource('all');
    ticketsAllResource.addMethod('GET', new apigateway.LambdaIntegration(getAllTicketsLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // PUT /tickets/{ticketId}/status (staff only)
    const ticketIdResource = ticketsResource.addResource('{ticketId}');
    const ticketStatusResource = ticketIdResource.addResource('status');
    ticketStatusResource.addMethod('PUT', new apigateway.LambdaIntegration(updateTicketStatusLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const noticesResource = api.root.addResource('notices');
    noticesResource.addMethod('GET', new apigateway.LambdaIntegration(getNoticesLambda), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: 'RigidResidentialApiUrl',
    });

    new cdk.CfnOutput(this, 'ImagesBucketName', {
      value: imagesBucket.bucketName,
      description: 'S3 Bucket for images',
    });

    new cdk.CfnOutput(this, 'BuildingsTableName', {
      value: buildingsTable.tableName,
      description: 'DynamoDB Buildings Table',
    });

    new cdk.CfnOutput(this, 'UnitsTableName', {
      value: unitsTable.tableName,
      description: 'DynamoDB Units Table',
    });

    new cdk.CfnOutput(this, 'TicketsTableName', {
      value: ticketsTable.tableName,
      description: 'DynamoDB Tickets Table',
    });

    new cdk.CfnOutput(this, 'NoticesTableName', {
      value: noticesTable.tableName,
      description: 'DynamoDB Notices Table',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: existingUserPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
    });
  }
}
