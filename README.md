# Pilot53

Pilot53 is the easiest way to handle and distribute servers among your team.

### Why and How

If you are either an Ops guy or a Dev and you have ever worked in a project/team with more than one server, you have felt the pain of:
- Keeping track of all your servers
- Distribute and maintain a servers list, maybe with `ssh` aliases
- Easily access each server as it's up and running

Pilot53 aims to solve all these problems by creating an `AWS lambda` function listening to `EC2` events and automatically registering new servers to a `Route53` DNS.

#### Use case example

Let's say that you have to create a new server, which for convenience you call and tag `web-1`. The lambda function will react to the creation of your new instance by extracting the `Name = web-1` tag and creating a new dns `A` record with value `web-1.yourdomain.com   <instance-1>`. As you `stop` or `terminate` the instance, the DNS record will be removed until re-run or creation.

All your team and services will be able to immediately reach the server by remembering the `Name` of the instance.
