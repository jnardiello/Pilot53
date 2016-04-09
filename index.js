AWS_ACCESS_ID = '<AWS_ACCESS_ID>'; // OPTIONAL
AWS_ACCESS_KEY = '<AWS_ACCESS_KEY>'; // OPTIONAL
AWS_REGION = '<AWS_REGION>'; // OPTIONAL

BASE_DOMAIN_NAME = '<DOMAIN_NAME>';
HOSTED_ZONE_ID = '<HOSTED_ZONE_ID>';

var util = require('util');
var aws = require('aws-sdk');
aws.config.update({accessKeyId: AWS_ACCESS_ID, secretAccessKey: AWS_ACCESS_KEY}); // OPTIONAL
aws.config.update({region: AWS_REGION}); // OPTIONAL

exports.handler = function(event, context) {
  var ec2 = new aws.EC2();
  var route53 = new aws.Route53();

  if (event.detail.state === 'running') {
    describeInstance(ec2, event.detail['instance-id'], function(err, instance) {
      if (err) {
        return context.fail(err);
      }
      domainNameFrom(instance, instance.InstanceId, context, function(err, FQDN) {
        if (err) {
          return context.fail(err);
        }
        addOrUpdateInRoute53(route53, FQDN, HOSTED_ZONE_ID, instance.PublicIpAddress, function(err) {
          if (err) {
            return context.fail(err);
          }
          return context.succeed('OK');
        });
      });
    });
  }
  if (event.detail.state === 'shutting-down' || event.detail.state === 'stopping') {
    ec2.describeInstances(function(err, result) {
      if (err) {
        context.fail(err);
        return;
      }
      result.Reservations.forEach(function(reservation) {
        reservation.Instances.forEach(function(instance) {
          domainNameFrom(instance, instance.InstanceId, context, function(err, FQDN) {
            if (err) {
              return context.fail(err);
            }
            removeFromRoute53(route53, FQDN, HOSTED_ZONE_ID, function(err) {
              if (err) {
                return context.fail(err);
              }
              return context.succeed('OK');
            });
          });
        });
      });
    });
  }
};

function describeInstance(ec2, instanceId, callback) {
  var params = {InstanceIds: [instanceId]};
  ec2.describeInstances(params, function(err, result) {
    if (err) {
      return callback(err, null);
    }
    result.Reservations.forEach(function(reservation) {
      reservation.Instances.forEach(function(instance) {
        if (instance.PublicIpAddress) {
          return callback(null, instance);
        }
        setTimeout(function() {
          console.log('Missing publicIP, try later...');
          describeInstance(ec2, instanceId, callback)
        }, 300);
      });
    });
  });
}

function addOrUpdateInRoute53(route53, FQDN, hostedZoneId, publicIp, callback) {
  hostedZoneRecord(route53, hostedZoneId, 'A', FQDN, function(err, resourceRecordSet) {
    if (err) {
      return callback(err);
    }
    var dnsRecordChange = {
      HostedZoneId: hostedZoneId,
      ChangeBatch: {
        Changes: [{
          Action: 'CREATE',
          ResourceRecordSet: {
            Name: FQDN,
            Type: 'A',
            ResourceRecords: [{Value: publicIp}],
            TTL: 60,
          }
        }]
      }
    };
    if (resourceRecordSet) {
      var previousIp = resourceRecordSet.ResourceRecords[0].Value;
      if (previousIp === publicIp) {
        console.log('Found A record for', FQDN, 'with current IP', publicIp, 'so nothing to do');
        return callback(null);
      }
      console.log('Found A record for', FQDN, 'with IP', previousIp, 'update to IP', publicIp);
      dnsRecordChange.ChangeBatch.Changes.unshift({
        Action: 'DELETE',
        ResourceRecordSet: {
          Name: FQDN,
          Type: 'A',
          ResourceRecords: [{Value: previousIp}],
          TTL: 60,
        }
      });
    } else {
      console.log('Missing A record for', FQDN);
    }
    route53.changeResourceRecordSets(dnsRecordChange, function(err, data) {
      if (err) {
        return callback(err);
      }
      console.log('Created A record for', FQDN, 'with IP', publicIp);
      return callback(null);
    });
  });
}

function removeFromRoute53(route53, FQDN, hostedZoneId, callback) {
  hostedZoneRecord(route53, hostedZoneId, 'A', FQDN, function(err, resourceRecordSet) {
    if (err) {
      return callback(err);
    }
    if (!resourceRecordSet) {
      console.log('Not found A record for', FQDN, 'so nothing to do');
      return callback(null);
    }
    var dnsRecordChange = {
      HostedZoneId: hostedZoneId,
      ChangeBatch: {
        Changes: [{
          Action: 'DELETE',
          ResourceRecordSet: {
            Name: FQDN,
            Type: 'A',
            ResourceRecords: resourceRecordSet.ResourceRecords,
            TTL: 60,
          }
        }]
      }
    };
    route53.changeResourceRecordSets(dnsRecordChange, function(err, data) {
      if (err) {
        return callback(err);
      }
      console.log('Removed A record for', FQDN);
      return callback(null);
    });
  });
}

function hostedZoneRecord(route53, hostedZoneId, recordType, FQDN, callback) {
  FQDN = util.format('%s.', FQDN);
  var params = {
    HostedZoneId: hostedZoneId,
    MaxItems: '1',
    StartRecordName: FQDN,
    StartRecordType: recordType
  };
  route53.listResourceRecordSets(params, function(err, data) {
    if (err) {
      return callback(err);
    }
    var resourceRecordSet = data.ResourceRecordSets && data.ResourceRecordSets[0];
    if (resourceRecordSet && (resourceRecordSet.Name === FQDN)) {
      return callback(null, resourceRecordSet);
    }
    callback(null, null);
  });
}


function domainNameFrom(instance, id, context, callback) {
  var domainName = null;
  instance.Tags.forEach(function(tag) {
    if (tag.Key === 'Name') {
      domainName = util.format('%s.%s', tag.Value, BASE_DOMAIN_NAME);
    }
  });
  if (domainName) {
    return callback(null, domainName);
  }
  callback(util.format("Unable to find tag with key 'Name' in instance '%s'", id), null);
}
