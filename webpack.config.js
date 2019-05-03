const webpack = require('webpack');
const config = require('sapper/config/webpack.js');
const pkg = require('./package.json');
const getPreprocessor = require('svelte-preprocess');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const mode = process.env.NODE_ENV;
const dev = mode === 'development';

const extensions = ['.mjs', '.js', '.json', '.svelte', '.html'];
const mainFields = ['svelte', 'module', 'browser', 'main'];
class SvelteExtractor {
	static extract(content) {
		return content.match(/[A-Za-z0-9-_:\/]+/g) || [];
	}
}

const purgesvelte = require('purgecss-from-svelte');

const getPostCSSPlugins = function(purgecss) {
	return [
		require('postcss-import'),
		require('postcss-url'),
		require('tailwindcss')('./tailwind.js'),
		require('postcss-flexbugs-fixes'),
		require('autoprefixer')({
			browsers: [
			'>1%',
			'last 4 versions',
			'Firefox ESR',
			'not ie < 9'
			],
			flexbox: 'no-2009'
		}),
		// Do not purge the CSS in dev mode to be able to play with classes in the browser dev-tools.
		purgecss &&
		require("@fullhuman/postcss-purgecss")({
			content: ["./**/*.svelte"],
			extractors: [
				{
					extractor: purgesvelte,

					// Specify the file extensions to include when scanning for
					// class names.
					extensions: ["svelte"]
				}
			],
			// Whitelist selectors to stop Purgecss from removing them from your CSS.
			whitelist: [
				"html",
				"body"
			]
		})
	].filter(Boolean)
}

const preprocess = getPreprocessor({
	transformers: { 
        postcss: {
			plugins: getPostCSSPlugins()
		},
    },
});



module.exports = {
	client: {
		entry: config.client.entry(),
		output: config.client.output(),
		resolve: { extensions, mainFields },
		module: {
			rules: [
				{
					test: /\.(svelte|html)$/,
					use: {
						loader: 'svelte-loader',
						options: {
							dev,
							hydratable: true,
							hotReload: false,
							preprocess
						}
					}
				}
			]
		},
		mode,
		plugins: [
			dev && new webpack.HotModuleReplacementPlugin(),
			new webpack.DefinePlugin({
				'process.browser': true,
				'process.env.NODE_ENV': JSON.stringify(mode)
			}),
		].filter(Boolean),
		devtool: dev && 'inline-source-map'
	},

	server: {
		entry: config.server.entry(),
		output: config.server.output(),
		target: 'node',
		resolve: { extensions, mainFields },
		externals: Object.keys(pkg.dependencies).concat('encoding'),
		module: {
			rules: [
				{
					test: /\.(svelte|html)$/,
					use: {
						loader: 'svelte-loader',
						options: {
							css: false,
							generate: 'ssr',
							preprocess,
							dev
						}
					}
				},
				{
					test: /\.css$/,
					use: [
						MiniCssExtractPlugin.loader,
						"css-loader",
						{
							loader: "postcss-loader",
							options: {
								plugins: getPostCSSPlugins(!dev)
							}
						}
					]
				}
			]
		},
		mode,
		performance: {
			hints: false // it doesn't matter if server.js is large
		},
		plugins: [
			new MiniCssExtractPlugin({
				// Options similar to the same options in webpackOptions.output
				// both options are optional
				filename: "../../../static/[name].css",
				chunkFilename: "[id].css"
			})
		]
	},

	serviceworker: {
		entry: config.serviceworker.entry(),
		output: config.serviceworker.output(),
		mode
	}
};
