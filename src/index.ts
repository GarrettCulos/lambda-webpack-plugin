import fs from 'fs';
import path from 'path';
import { createAction, mkdirAction, rimrafAction, copyAction } from './actions';
const pluginName = 'SamWebpackPlugin';

const alphabetizeObject = (obj: any) => {
  return Object.keys(obj)
    .sort()
    .reduce((sortedObject: any, key: string) => {
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        sortedObject[key] = alphabetizeObject(obj[key]);
      } else {
        sortedObject[key] = obj[key];
      }
      return sortedObject;
    }, {});
};

export class SamWebpackPlugin {
  declarationRegex = /(?<=@WebpackLambda\()([^\)]+)(?=(\)))/g;
  deploymentFolder: string;
  options: { [optionName: string]: any } = {};
  layers: { [optionName: string]: string } = {};
  baseTemplate: any;

  /**
   * @param {Object} options
   * @param {String} options.baseTemplate [required]
   * @param {Array} options.layers
   * @param {String} options.output
   * @param {Boolean} options.verbose
   */
  constructor(d: {
    output?: string;
    requireTxt?: boolean;
    verbose?: boolean;
    baseTemplate: string;
    layers?: { [name: string]: string };
  }) {
    /**
     * define regex's
     */

    /**
     * deployment folder that holds all deployment functions
     */
    if (d.output && typeof d.output !== 'string') {
      throw `[${pluginName}]: options.output must be of type String`;
    }
    this.deploymentFolder = d.output || './lambda-sam-deploy';

    /**
     * verbose setting must be a boolean if set
     */
    if (d.verbose && typeof d.verbose !== 'boolean') {
      throw `[${pluginName}]: options.output must be a boolean`;
    }
    this.options.verbose = d.verbose || false;

    /**
     * verbose setting must be a boolean if set
     */
    if (d.requireTxt && typeof d.requireTxt !== 'boolean') {
      throw `[${pluginName}]: options.requireTxt must be a boolean`;
    }
    this.options.requireTxt = d.requireTxt || false;

    /**
     * layers setting must be an array if set
     */
    if (Boolean(d.layers) && typeof d.layers !== 'object') {
      throw `[${pluginName}]: options.layers must be of type object`;
    }
    this.layers = d.layers;

    /**
     * baseTemplate must be of type string
     */
    if (!d.baseTemplate || typeof d.baseTemplate !== 'string') {
      throw `[${pluginName}]: options.baseTemplate must be of defined and of type String`;
    }
    this.baseTemplate = JSON.parse(fs.readFileSync(d.baseTemplate, 'utf8'));
  }

  /**
   * Parses the content of the lambda decorator
   * @param {String} content
   * @returns {Object}
   */
  parseLambdaDeclaration(content: string): object {
    // TODO handle error when parsing @WebpackLambda decorator;
    const match = content.match(this.declarationRegex);
    if (!match) return;
    return JSON.parse(match[0]);
  }

  /**
   * Compute all external dependencies and sub deps
   * @param {Array} dependencies
   * @returns {String[]}
   */
  logDependencies(dependencies: any[]) {
    const deps: { request: string; [other: string]: any }[] = [];
    Array.isArray(dependencies) &&
      dependencies.forEach(dependency => {
        if (dependency.request) {
          const notPath = dependency.request === path.basename(dependency.request);
          const externalType = dependency.module && dependency.module.externalType;
          const subDependencies = dependency.module && dependency.module.dependencies;
          if (subDependencies) {
            deps.push(...this.logDependencies(subDependencies));
          }
          if (notPath) {
            deps.push({ request: dependency.request, type: externalType });
          }
        }
      });
    return deps;
  }

  getPackageDependencies(packageName: string, nodeModulesPath: string): string[] {
    try {
      const content = fs.readFileSync(path.join(nodeModulesPath, packageName, 'package.json'), 'utf8');

      const pkg = JSON.parse(content);
      const dependencies = pkg && pkg.dependencies ? Object.keys(pkg.dependencies) : [];
      const phantomDependencies = pkg && pkg._phantomChildren ? Object.keys(pkg._phantomChildren) : [];
      return [...dependencies, ...phantomDependencies];
    } catch (err) {
      throw err;
    }
  }

  getAllDependencies(depStrings: string | string[], nodeModulesPath: string): string[] {
    const unloadedDeps: string[] = Array.isArray(depStrings) ? depStrings : [depStrings];
    const loadedDeps: string[] = [];
    while (unloadedDeps.length > 0) {
      const currentDeps = unloadedDeps.shift();
      try {
        const deps = this.getPackageDependencies(currentDeps, nodeModulesPath);
        const newDeps = deps.filter(dep => !loadedDeps.includes(dep));
        unloadedDeps.push(...newDeps);
        loadedDeps.push(currentDeps);
      } catch (error) {
        console.warn(`WARN: Lambda Webpack Plugin: ${error}`);
        // console.error(error);
      }
    }
    return loadedDeps;
  }

  /**
   * webpack plugin apply function
   * @param compiler
   */
  apply(compiler: any) {
    const plugin = {
      name: pluginName
    };

    /**
     * globally available data
     */
    const globals: any = {
      entries: {},
      outputPath: compiler.options.output.path,
      deployFolder: path.join(compiler.options.context, this.deploymentFolder),
      alias: compiler.options.resolve.alias
    };
    /**
     * All entry files will be checked for lambda declaration. If decorator is present, add config, context, path, and filename to globals.entries
     * @param {*} context
     * @param {*} entries
     */
    const registerEntryLambdaFunctions = (context: any, entries: any) => {
      // register entries with lambda function parser
      globals.entries = Object.keys(entries).reduce((acc, entry) => {
        const content = fs.readFileSync(entries[entry], 'utf8');
        const config = this.parseLambdaDeclaration(content);
        if (config) {
          return {
            ...acc,
            [entry]: {
              key: entry,
              context,
              path: entries[entry],
              files: [],
              filename: path.basename(entry, path.extname(entry)),
              config,
              dependencies: undefined
            }
          };
        }
        return acc;
      }, {});
    };

    /**
     * For each chunk, if its been flagged as having a lambda decorator (is within globals.entries), add files, and dependencies to the entry
     * @param {*} compilation
     * @param {*} callback
     */
    const addConfigDependencies = (compilation: any, callback: any) => {
      compilation.chunks.forEach((chunk: any) => {
        if (globals.entries[chunk.name]) {
          globals.entries[chunk.name].files = chunk.files;
          globals.entries[chunk.name].dependencies = this.logDependencies(chunk.entryModule.dependencies).reduce(
            (acc, key) => {
              if (!acc.find((dep: any) => dep.request === key.request)) {
                acc.push(key);
              }
              return acc;
            },
            []
          );
        }
      });

      callback();
    };

    /**
     * Once webpack is done (so files have been written) create sam application structure
     *  - create folders for each lambda function (deployment folder)
     *  - create sam template from baseTemplate and parsed configs
     * @param {*} compilation
     * @param {*} callback
     */
    const createLambdaDeployments = (compilation: any, callback: any) => {
      const entries = Object.keys(globals.entries).map(key => globals.entries[key]);
      const commands = [];

      /**
       * create deployment folder
       */
      commands.push(rimrafAction({ source: globals.deployFolder }, this.options));
      commands.push(mkdirAction({ source: globals.deployFolder }, this.options));

      entries.forEach(entry => {
        /**
         * create deployment folder (half hash and name)
         */
        const entryCodeUriPath = entry.filename;
        const entryPath = path.join(globals.deployFolder, entryCodeUriPath);
        commands.push(mkdirAction({ source: entryPath }, this.options));

        /**
         * move lambda function
         */
        entry.files.forEach((file: any) => {
          // when we can compute the function name, add in standard index.js handler
          // path.join(entryPath, 'index.js')
          commands.push(
            copyAction({ source: path.join(globals.outputPath, file), destination: entryPath }, this.options)
          );
        });

        /**
         * copy alias references that are external into node_modules folder
         */
        commands.push(mkdirAction({ source: path.join(entryPath, 'node_modules') }, this.options));

        /**
         * copy first layer of dependencies into requirements.txt
         */
        if (this.options.requireTxt) {
          const dependenciesFile = entry.dependencies.map((deps: any) => deps.request).join(' \n');
          commands.push(
            createAction(
              {
                source: path.join(entryPath, 'requirements.txt'),
                content: dependenciesFile
              },
              this.options
            )
          );
        }

        /**
         * copy all dependencies into deployment folder
         */
        if (!this.options.requireTxt) {
          const allDependencies = entry.dependencies.reduce((acc: string[], dependency: any) => {
            if (this.layers && this.layers[dependency.request]) {
              acc.push(dependency.request);
            } else if (dependency.type !== undefined) {
              const deps = this.getAllDependencies(dependency.request, path.join(entry.context, 'node_modules'));
              acc.push(...deps);
            }
            return acc;
          }, []);

          allDependencies.forEach((dependency: string) => {
            let source = undefined;
            if (this.layers && this.layers[dependency]) {
              source = path.join(this.layers[dependency], '**/*');
            } else {
              source = path.join(entry.context, 'node_modules', dependency, '**/*');
            }
            commands.push(
              copyAction({ source, destination: path.join(entryPath, 'node_modules', dependency) }, this.options)
            );
          });
        }

        /**
         * merge entry with base cf template
         */
        // TODO: when file name is already in the template throw error.
        const functionTemplate = alphabetizeObject({
          [`Function${entry.filename.replace(/-/g, '')}`]: {
            ...entry.config,
            ['Type']: 'AWS::Serverless::Function',
            ['Properties']: {
              ...entry.config.Properties,
              ...entry.config.properties,
              ['CodeUri']: `./${entryCodeUriPath}`
            }
          }
        });

        this.baseTemplate = {
          ...this.baseTemplate,
          Resources: {
            ...this.baseTemplate.Resources,
            ...functionTemplate
          }
        };
      });

      commands.push(
        createAction(
          {
            source: path.join(globals.deployFolder, 'template.json'),
            content: JSON.stringify(JSON.parse(JSON.stringify(this.baseTemplate)))
          },
          this.options
        )
      );

      if (commands.length) {
        commands.reduce((previous: Promise<any>, fn: Function) => {
          return previous.then(retVal => fn(retVal)).catch(err => console.log(err));
        }, Promise.resolve());
      }

      callback();
    };

    compiler.hooks.entryOption.tap(plugin, registerEntryLambdaFunctions);
    compiler.hooks.emit.tapAsync(plugin, addConfigDependencies);
    compiler.hooks.done.tapAsync(plugin, createLambdaDeployments);
  }
}
