# Pilot53

`Pilot53` will create a new `Route53` DNS record as you create new `EC2` instances. It's the easiest way to handle multiple servers.

### Why and How

If you are either an Ops guy or a Dev and you have ever worked in a project/team with more than one server, you have felt the pain of:
- Keeping track of all your servers
- Distribute and maintain a servers list, maybe with `ssh` aliases
- Easily access each server as it's up and running

Pilot53 is a `AWS lambda` function listening to `EC2` events and automatically registering new servers to a `Route53`

### Use case

You create a new `EC2` instance with tag `Name: web-1`. `Pilot53` will receive an event from `EC2` as your instance will become `running` and will create the new DNS record. In the end, without ever touching anything all your team will be able to access `web-1` from `web-1.yourdomain.com`

## Setup

1. Create a new `Hostedzone` in `Route53`. This is where your DNS domain will live. Note down the `Hosted Zone ID`.

2. Create a new `IAM` role that will run your lambda function. It will need `ReadAccess` on `EC2` and `FullAccess` on `Lambda`.

3. Create your `lambda` function. From the AWS Console select `AWS Lambda`, click on `create a Lambda function` and skip the blueprint selection. Here you can name your function, just make sure to select `Node.js >= 4.3`. 

4. Copy the content of `index.js` in the `Lambda function code` text area. Make sure to add your `BASE_DOMAIN_NAME` (ex. `opengrid.xyz`) and the `HOSTED_ZONE_ID` from your Route53. Select as `Role` the newly created `IAM role`

3. You need now to bind your lambda function to specific `EC2` events. You can do that in the `CloudWatch` section of your `AWS Console`. Click on `Events` and create a new `rule`. Select `EC2 instance state change notification`, from `specific state` select `Running, Shutting Down and Stopping`. Then add a new `Target` where you will need to select your newly created `lambda function`. Choose a name for your Rule definition and simply create it.

You should be good to go.

## Expected Behaviour
### Create
When creating a new instance, `Pilot53` will look for the tag `Name` and will use it to create the DNS entry. A tag called `web-1` will generate the DNS record `web-1.yourdomain.xpz`

### Delete
As your instance gets `stopped` or `terminated`, `Pilot53` will *remove* the related DNS entry

### Update
If you wish to swap an instance, simply create a new instance with the same name as the instance you want to substitute. As the new instance is created, `Pilot53` will first `DELETE` the current DNS entry and create a new one with the updated instance IP. *Pay attention*: if you do that and the new machine isn't ready to be provisioned, the DNS will be anyway swapped. This will cause downtime of your services while the new machine is provisioned.

## Credits
This project was developed after a hint from (pracucci)[https://github.com/pracucci].  
Thanks to (gabrielelana)[https://github.com/pracucci] for co-authoring this project during the amazing sessions of the Open Source Saturday
