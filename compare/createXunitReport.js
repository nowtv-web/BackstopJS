(function () {
    var fs = require('fs'),
        async = require('async'),
        resemble = require('node-resemble-js'),
        builder = require('xmlbuilder'),
        testPairs = [],
        testsFailed = 0,
        defaultMisMatchThreshold = 1,
        xmlObj = builder.create('testsuite'),
        configFile;

    var TestPairObj = function (reference, test, pair) {
        this.a = {src: reference || '', srcClass: 'reference'};
        this.b = {src: test || '', srcClass: 'test'};
        this.c = {src: '', srcClass: 'diff'};
        this.report = null;
        this.passed = false;
        this.meta = pair;
        this.meta.misMatchThreshold = (pair && pair.misMatchThreshold && pair.misMatchThreshold >= 0) ? pair.misMatchThreshold : defaultMisMatchThreshold;

        this.compare = function (cb) {
            var xmlEle,
                startTime = new Date(),
                self = this;

            resemble(this.a.src).compareTo(this.b.src).onComplete(function (diffData) {
                self.report = diffData;
                self.mismatchImage = !(diffData.misMatchPercentage < self.meta.misMatchThreshold);
                self.passed = diffData.isSameDimensions && diffData.misMatchPercentage < self.meta.misMatchThreshold;

                xmlEle = xmlObj.ele('testcase', getTestCaseAttrs(self));
                if (!self.passed) {
                    xmlEle.ele('failure', getFailureAttrs(self), getFailureMessage(self));
                }
                xmlEle.att('time', getTimeDifference(startTime));
                if (cb) {
                    cb();
                }
            });
        };

        function getTestCaseAttrs(self) {
            return {
                classname: self.meta.label,
                name: self.meta.selector + ' ' + self.meta.fileName
            };
        }

        function getFailureAttrs(self) {
            return {
                type: self.report.isSameDimensions ? 'Total mismatch'
                    : 'Image mismatch'
            };
        }

        function getFailureMessage(self) {
            var failureMessage = '';
            if (!self.report.isSameDimensions) {
                var dimenDiff = self.report.dimensionDifference;
                failureMessage += 'Dimensions mismatch, difference in width: ' +
                                    dimenDiff.width +
                                    ', difference in height: ' +
                                    dimenDiff.height;
            }

            if (self.mismatchImage) {
                failureMessage += ' Image mismatch of ' + self.report.misMatchPercentage + '%';
            }

            return failureMessage;
        }
    };

    function getTimeDifference(startTime) {
        return (new Date() - startTime) / 1000;
    }

    function compareTestPairs() {
        var startTime = new Date();

        async.each(
            testPairs,
            function (testPair, cb) {
                testPair.compare(function () {
                    if (!testPair.passed) {
                        testsFailed++;
                    }
                    cb();
                });
            },
            function (err) {
                if (err) {
                    console.log('Something went badly wrong!', err);
                    return;
                }
                xmlObj.att('tests', testPairs.length);
                xmlObj.att('failures', testsFailed);
                xmlObj.att('time', getTimeDifference(startTime));
                fs.writeFileSync(__dirname + '/results.xml', xmlObj.end({pretty: true}))
            }
        );
    }

    configFile = JSON.parse(fs.readFileSync(__dirname + '/config.json'));

    configFile.testPairs.forEach(function (testPair) {
        testPairs.push(new TestPairObj(__dirname+ '/../' + testPair.reference, __dirname+'/../' + testPair.test, testPair));
    });

    compareTestPairs();
})();