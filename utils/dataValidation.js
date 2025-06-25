const { getResponseBody } = require('./commonUtils');

const validateRequestParameter = (requestBody, requiredParameters, optionalParameters = []) => {
    const requestParameters = Object.keys(requestBody);
    const totalParameters = [...requiredParameters, ...optionalParameters];
    const parameterOutput = {
        isSuccess: true,
        error: '',
    };

    for (const parameter of totalParameters) {
        if (!requestParameters.includes(parameter)) {
            if (requiredParameters.includes(parameter)) {
                parameterOutput.isSuccess = false;
                parameterOutput.error = `${parameter} is not provided, its a required parameter`;
            }
        } else if (requiredParameters.includes(parameter)
            && (requestBody[parameter] === undefined)
        ) {
            parameterOutput.isSuccess = false;
            parameterOutput.error = `${parameter} is invalid data, its a required parameter`;
        }

        if (!parameterOutput.isSuccess) {
            return parameterOutput;
        }
    }

    return parameterOutput;
};

module.exports.getdataValidationMiddleware = (requiredParam) => (req, res, next) => {
    const paramOutput = validateRequestParameter(req.body, requiredParam);

    if (!paramOutput.isSuccess) {

        return res.status(400).send(getResponseBody(400, paramOutput.error));
    }

    next()
}
