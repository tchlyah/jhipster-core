/** Copyright 2013-2020 the original author or authors from the JHipster project.
 *
 * This file is part of the JHipster project, see http://www.jhipster.tech/
 * for more information.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const Validator = require('./validator');
const {
  OptionNames,
  OptionValues,
  getTypeForOption,
  doesOptionExist,
  doesOptionValueExist
} = require('../core/jhipster/application_options');
const { UAA, MICROSERVICE } = require('../core/jhipster/application_types');
const {
  COUCHBASE,
  CASSANDRA,
  MONGODB,
  MARIADB,
  MSSQL,
  MYSQL,
  ORACLE,
  POSTGRESQL,
  SQL
} = require('../core/jhipster/database_types');

class ApplicationValidator extends Validator {
  constructor() {
    super('application', []);
  }

  validate(jdlApplication) {
    if (!jdlApplication) {
      throw new Error('An application must be passed to be validated.');
    }
    checkRequiredOptionsAreSet(jdlApplication);
    checkBaseNameAgainstApplicationType(jdlApplication);
    checkLanguageOptions(jdlApplication);
    checkForValidValues(jdlApplication);
    checkForInvalidDatabaseCombinations(jdlApplication);
  }
}

module.exports = ApplicationValidator;

function checkRequiredOptionsAreSet(jdlApplication) {
  if (
    !jdlApplication.hasOption('applicationType') ||
    !jdlApplication.hasOption('authenticationType') ||
    !jdlApplication.hasOption('baseName') ||
    !jdlApplication.hasOption('buildTool')
  ) {
    throw new Error(
      'The application applicationType, authenticationType, baseName and buildTool options are required.'
    );
  }
}

function checkBaseNameAgainstApplicationType(jdlApplication) {
  const applicationBaseName = jdlApplication.getOptionValue('baseName');
  const applicationType = jdlApplication.getOptionValue('applicationType');
  if (applicationBaseName.includes('_') && (applicationType === UAA || applicationType === MICROSERVICE)) {
    throw new Error(
      "An application name can't contain underscores if the application is a microservice or a UAA application."
    );
  }
}

function checkLanguageOptions(jdlApplication) {
  const presentTranslationOption = jdlApplication.hasOption('enableTranslation');
  if (presentTranslationOption) {
    const translationEnabled = jdlApplication.getOptionValue('enableTranslation');
    const presentNativeLanguage = jdlApplication.hasOption('nativeLanguage');
    if (translationEnabled && !presentNativeLanguage) {
      throw new Error('No chosen language.');
    }
  }
}

function checkForValidValues(jdlApplication) {
  const optionsToIgnore = [
    'baseName',
    'packageName',
    'packageFolder',
    'serverPort',
    'uaaBaseName',
    'blueprint',
    'jhiPrefix',
    'jwtSecretKey',
    'rememberMeKey',
    'languages',
    'nativeLanguage',
    'jhipsterVersion',
    'dtoSuffix',
    'entitySuffix',
    'otherModules',
    'creationTimestamp'
  ];
  jdlApplication.forEachOption(option => {
    if (optionsToIgnore.includes(option.name)) {
      return;
    }
    checkForUnknownApplicationOption(option);
    checkForBooleanValue(option);
    checkSpecificOptions(option);
  });
}

function checkForUnknownApplicationOption(option) {
  if (!doesOptionExist(option.name)) {
    throw new Error(`Unknown application option '${option.name}'.`);
  }
}

function checkForBooleanValue(option) {
  if (getTypeForOption(option.name) === 'boolean' && typeof option.getValue() !== 'boolean') {
    throw new Error(`Expected a boolean value for option '${option.name}'`);
  }
}

function checkSpecificOptions(option) {
  switch (option.name) {
    case 'clientTheme':
    case 'clientThemeVariant':
      return;
    case 'testFrameworks':
      checkTestFrameworkValues(option.getValue());
      break;
    case 'databaseType':
      checkDatabaseTypeValue(option.getValue());
      break;
    case 'devDatabaseType':
      checkDevDatabaseTypeValue(option.getValue());
      break;
    case 'prodDatabaseType':
      checkProdDatabaseTypeValue(option.getValue());
      break;
    default:
      checkForUnknownValue(option);
  }
}

function checkTestFrameworkValues(values) {
  if (Object.keys(values).length === 0) {
    return;
  }
  values.forEach(value => {
    if (!doesOptionValueExist('testFrameworks', value)) {
      throw new Error(`Unknown value '${value}' for option 'testFrameworks'.`);
    }
  });
}

function checkDatabaseTypeValue(value) {
  if (!doesOptionValueExist('databaseType', value)) {
    throw new Error(`Unknown value '${value}' for option 'databaseType'.`);
  }
}

function checkDevDatabaseTypeValue(value) {
  if (
    !doesOptionValueExist('databaseType', value) &&
    !doesOptionValueExist('devDatabaseType', value) &&
    !doesOptionValueExist('prodDatabaseType', value)
  ) {
    throw new Error(`Unknown value '${value}' for option 'devDatabaseType'.`);
  }
}

function checkProdDatabaseTypeValue(value) {
  if (!doesOptionValueExist('databaseType', value) && !doesOptionValueExist('prodDatabaseType', value)) {
    throw new Error(`Unknown value '${value}' for option 'prodDatabaseType'.`);
  }
}

function checkForUnknownValue(option) {
  if (getTypeForOption(option.name) !== 'boolean' && !doesOptionValueExist(option.name, option.getValue())) {
    throw new Error(`Unknown option value '${option.getValue()}' for option '${option.name}'.`);
  }
}

function checkForInvalidDatabaseCombinations(jdlApplication) {
  const databaseType = jdlApplication.getOptionValue('databaseType');
  const devDatabaseType = jdlApplication.getOptionValue('devDatabaseType');
  const prodDatabaseType = jdlApplication.getOptionValue('prodDatabaseType');
  const enabledHibernateCache = jdlApplication.getOptionValue('enableHibernateCache');

  if (databaseType === SQL) {
    if (![MYSQL, POSTGRESQL, MARIADB, ORACLE, MSSQL].includes(prodDatabaseType)) {
      throw new Error(
        `Only ${formatValueList([
          MYSQL,
          POSTGRESQL,
          MARIADB,
          ORACLE,
          MSSQL
        ])} are allowed as prodDatabaseType values for databaseType 'sql'.`
      );
    }
    if (
      ![
        OptionValues[OptionNames.DEV_DATABASE_TYPE].h2Memory,
        OptionValues[OptionNames.DEV_DATABASE_TYPE].h2Disk,
        prodDatabaseType
      ].includes(devDatabaseType)
    ) {
      throw new Error(
        `Only ${formatValueList([
          OptionValues[OptionNames.DEV_DATABASE_TYPE].h2Memory,
          OptionValues[OptionNames.DEV_DATABASE_TYPE].h2Disk,
          prodDatabaseType
        ])} are allowed as devDatabaseType values for databaseType 'sql'.`
      );
    }
    return;
  }
  if ([MONGODB, COUCHBASE, CASSANDRA].includes(databaseType)) {
    if (databaseType !== devDatabaseType || databaseType !== prodDatabaseType) {
      throw new Error(
        `When the databaseType is either ${formatValueList([
          MONGODB,
          COUCHBASE,
          CASSANDRA
        ])}, the devDatabaseType and prodDatabaseType must be the same.`
      );
    }
    if (enabledHibernateCache) {
      throw new Error(`An application having ${databaseType} as database type can't have the hibernate cache enabled.`);
    }
  }
}

function formatValueList(list) {
  return list.map(item => `'${item}'`).join(', ');
}
