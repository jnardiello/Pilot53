AWS_ACCESS_ID = '<AWS_ACCESS_ID>';
AWS_ACCESS_KEY = '<AWS_ACCESS_KEY>';
AWS_REGION = '<AWS_REGION>';

BASE_DOMAIN_NAME = '<DOMAIN_NAME>';
HOSTED_ZONE_ID = '<HOSTED_ZONE_ID>';

var util = require('util');
var aws = require('aws-sdk');
aws.config.update({accessKeyId: AWS_ACCESS_ID, secretAccessKey: AWS_ACCESS_KEY});
aws.config.update({region: AWS_REGION});

exports.handler = function(event, context) {
  var ec2 = new aws.EC2();
  var route53 = new aws.Route53();

  ec2.describeInstances(function(err, result) {
    if (err) {
      context.fail(err);
      return;
    }

    result.Reservations.forEach(function(reservation) {
      reservation.Instances.forEach(function(instance) {
        if ((instance.InstanceId) == event.detail['instance-id']) {
          var id = instance.InstanceId;
          var ip = instance.PublicIpAddress;

          domainNameFrom(instance, context, function(name) {
            dnsRecordBuilder = createDnsRecord;
            if (event.detail.state === 'stopping' || event.detail.state === 'shutting-down') {
              dnsRecordBuilder = deleteDnsRecord;
            }
            route53.changeResourceRecordSets(dnsRecordBuilder(ip, name), function(err, data) {
              if (err) {
                context.fail(err);
                return;
              }
              console.log('Change DNS record: ', JSON.stringify(dnsRecordBuilder(ip, name)));
              context.succeed('Changed DNS record');
            });
          });
        }
      });
    });
  });
};

function domainNameFrom(instance, context, callback) {
  instance.Tags.forEach(function(tag) {
    if (tag.Key === 'Name') {
      return callback(util.format('%s.%s', tag.Value, BASE_DOMAIN_NAME));
    }
  });
  context.fail(util.format("Unable to find tag with key 'Name' in instance '%s'", id));
}

function deleteDnsRecord(ip, name) {
  return dnsRecord('DELETE', ip, name);
}

function createDnsRecord(ip, name) {
  return dnsRecord('CREATE', ip, name);
}

function dnsRecord(action, ip, name) {
  return {
    HostedZoneId: HOSTED_ZONE_ID,
    ChangeBatch: {
      Changes: [{
        Action: action,
        ResourceRecordSet: {
          Name: name,
          Type: 'A',
          ResourceRecords: [{Value: ip}],
          TTL: 600,
        }
      }]
    }
  };
}
