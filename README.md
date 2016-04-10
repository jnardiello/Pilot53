# Pilot53

Automatic DNS for `EC2` instances on `Route53`.

### Why and How

If you have ever worked in a project/team with more than one server, you have felt the pain of:
- Keeping track of all your servers
- Distribute and maintain a servers list, maybe with `ssh` aliases
- Easily access each server as it's up and running

Pilot53 is a `AWS lambda` function listening to `EC2` events and automatically registering new servers to `Route53` based on their `Name` tag.

### Use case

You create a new `EC2` instance with tag `Name: web-1`. `Pilot53` will receive an event from `EC2` as your instance will become `running` and will create a new DNS record. Your team will be able to access `web-1` from `web-1.yourdomain.com`

### Expected Behaviour
#### Create
When creating a new instance, `Pilot53` will look for the tag `Name` and will use it to create the DNS entry. For example, creating an instance with `Name` tag called `web-1` will generate a DNS record `web-1.yourdomain.xpz`

#### Delete
As your instance gets `stopped` or `terminated`, `Pilot53` will *remove* the related DNS entry

#### Update
If you wish to swap an instance, simply create a new instance with the same `Name` tag. As the new instance is created, `Pilot53` will first `DELETE` the current DNS entry and create a new one with the updated instance IP. *Pay attention*: if you do that and the new machine hasn't yet been provisioned, the DNS will be anyway swapped. This will cause downtime of your services until the new machine is ready.

# Setup

1. Create a new `Hostedzone` in `Route53`. This is where your DNS domain will live. Note down the `Hosted Zone ID`.

2. Create a new `IAM` role that will run your lambda function. It will need `ReadAccess` on `EC2` and `FullAccess` on `Lambda`.

3. Create your `lambda` function. From the AWS Console select `AWS Lambda`, click on `create a Lambda function` and skip the blueprint selection. Here you can name your function, just make sure to select `Node.js >= 4.3`. 

4. Copy the content of `index.js` in the `Lambda function code` text area. Make sure to add your `BASE_DOMAIN_NAME` (ex. `opengrid.xyz`) and the `HOSTED_ZONE_ID` from your Route53. Select as `Role` the newly created `IAM role`

5. You need now to bind your lambda function to specific `EC2` events. You can do that in the `CloudWatch` section of your `AWS Console`. Click on `Events` and create a new `rule`. Select `EC2 instance state change notification`, from `specific state` select `Running, Shutting Down and Stopping`. Then add a new `Target` where you will need to select your newly created `lambda function`. Choose a name for your Rule definition and simply create it.

If everything went well, you should be good to go.

*Note*: You can add your `base_domain` to your `Search Domains` to be able to simply (for example) do `ssh <newly-created-instance-name>`

## Credits
This project was developed after a hint/idea from [pracucci](https://github.com/pracucci)  
Thanks to [gabrielelana](https://github.com/pracucci) for co-authoring/contributing.  
The project was developed during the [Open Source Saturday](http://www.meetup.com/Open-Source-Saturday-Milano/). If you live in Milan, you should check it out.
