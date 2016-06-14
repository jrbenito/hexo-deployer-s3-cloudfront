var chalk = require('chalk');
var level = require('level');
var s3sync = require('s3-sync-aws');
var readdirp = require('readdirp');
var cloudfront = require('cloudfront');

module.exports = function(args) {
  var publicDir = this.config.public_dir;
  var log = this.log;

  if (!args.hasOwnProperty('concurrency')) {
    args.concurrency = 8;
  }

  if (!args.hasOwnProperty('aws_key')) {
    args.aws_key = process.env.AWS_KEY;
  }

  if (!args.hasOwnProperty('aws_secret')) {
    args.aws_secret = process.env.AWS_SECRET;
  }

  if (!args.hasOwnProperty('force_overwrite')) {
    args.force_overwrite = true;
  }

  if (!args.hasOwnProperty('headers')) {
    args.headers = {};
  }

  if (!args.bucket || !args.aws_key || !args.aws_secret || !args.cf_distribution) {
    var help = '';

    help += 'You should configure deployment settings in _config.yml first!\n\n';
    help += 'Example:\n';
    help += '  deploy:\n';
    help += '    type: s3-cloudfront\n';
    help += '    bucket: <bucket>\n';
    help += '    [aws_key]: <aws_key>        # Optional, if provided as environment variable\n';
    help += '    [aws_secret]: <aws_secret>  # Optional, if provided as environment variable\n';
    help += '    [concurrency]: <concurrency>\n';
    help += '    [force_overwrite]: <true/false>   # Optional, default true\n';
    help += '    [region]: <region>          # Optional, default "us-standard"\n';
    help += '    [cf_distribution]: <cf_distribution>\n';
    help += '    [headers]: <headers in json format>\n\n';
    help += 'For more help, you can check the docs: ' + chalk.underline('https://github.com/Wouter33/hexo-deployer-s3-cloudfront');

    console.log(help);
    return;
  }

  // s3sync takes the same options arguments as `knox`,
  // plus some additional options listed above

  var syncinput = {
    key: args.aws_key,
    secret: args.aws_secret,
    bucket: args.bucket,
    concurrency: args.concurrency,
    region: args.region,
    headers: args.headers
  };

  // Level db for cache, makes less S3 requests
  db = level('./cache-s3-cf-deploy')

  if(args.force_overwrite){
      syncinput.force = true;
  }

  return readdirp({root: publicDir, entryType: 'both'})
      .pipe(s3sync(db, syncinput).on('data', function(file) {
        log.info(file.fullPath + ' -> ' + file.url)
      }).on('end', function() {
        log.info('Deployed to S3, invalidate Cloudfront distribution now');

        var cf = cloudfront.createClient(args.aws_key, args.aws_secret);

        return cf.createInvalidation(args.cf_distribution, 'dsadasds' + Math.round(new Date().getTime()/1000), '/*', function(err, invalidation) {
            if (err){
                console.log(err);
            } else {
                log.info('Deployment completed');
            }
        })

      }).on('fail', function(err) {
        log.error(err)
      }));
};
