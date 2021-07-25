const path = require("path")
const { option } = require("yargs")

module.exports = {
	rules: {
		["restrict-crosszone-import"]: {
			meta: {
				type: "problem",
				docs: {
					description: "It is forbidden to import from a direction to a direction.",
					category: "Possible Errors",
					recommended: false
				},
				fixable: null,
				schema: [
					{
						type: 'object',
						properties: {
							zones: {
								type: 'array',
								items: {
									type: 'object',
									properties: {
										name: { type: 'string' },
										paths: {
											type: 'array',
											items: { type: 'string' },
										},
										uses: {
											type: 'array',
											items: { type: 'string' },
										}
									}
								}
							}
						}
					}
				]
			},

			create: context => {
				const basePath = process.cwd()
				const currentFilename = context.getFilename()
				const options = context.options[0] || {}
				const restrictedPaths = options.zones || []

				return {
					ImportDeclaration: node => {
						const { source } = node
						const importPath = source.value
						const absoluteImportPath = path.resolve(path.dirname(currentFilename), importPath).normalize()
						const relativeImportPath = path.relative(basePath, absoluteImportPath).normalize()

						restrictedPaths.forEach(zone => {
							const zonePaths = zone.paths
							let zoneUses = zone.uses

							let currentZonePath = ''
							let foundZonePath = false

							zonePaths.forEach(zonePath => {
								const absoluteZonePath = path.resolve(basePath, zonePath).normalize()
								if (currentFilename.startsWith(absoluteZonePath)) {
									currentZonePath = zonePath
									foundZonePath = true
								}
							})

							if (foundZonePath) {
								zoneUses = zoneUses.concat(zonePaths)
								let foundPath = false

								zoneUses.forEach(uses => {
									const absoluteAllowedPath = path.resolve(basePath, uses).normalize()
									if (absoluteImportPath.startsWith(absoluteAllowedPath)) {
										foundPath = true
									}
								})

								if (!foundPath) {
									context.report({
										node: node,
										message: "In the current directory, import from {{ zone }} is prohibited.",
										data: {
											zone: relativeImportPath
										}
									})
								}
							}
						})
					}
				}
			}
		},



		['restricted-import']: {
			meta: {
				type: "problem",
				docs: {
					description: "Prohibits importing from a specific directory / file to all directories except those specified in the WhiteList.",
					category: "Possible Errors",
					recommended: false
				},
				fixable: null,
				schema: [
					{
						type: 'array',
						items: {
							type: 'object',
							properties: {
								restrictedPaths: { type: 'string' },
								whiteList: {
									type: 'array',
									items: { type: 'string' }
								}
							}
						}
					}
				]
			},

			create: context => {
				const basePath = process.cwd()
				const currentFilename = context.getFilename()
				const options = context.options[0] || {}

				return {
					ImportDeclaration: node => {
						const { source } = node
						const importPath = source.value
						const absoluteImportPath = path.resolve(path.dirname(currentFilename), importPath)

						options.forEach(option => {
							const restrictedPaths = path.resolve(basePath, option.restrictedPaths)
							const whiteList = option.whiteList || []
							const absoluteRestrictedPath = path.resolve(basePath, restrictedPaths)
							if (absoluteImportPath.startsWith(absoluteRestrictedPath)) {
								let PathFound = false

								whiteList.forEach(relativeProjectPath => {
									if (currentFilename.startsWith(path.resolve(basePath, relativeProjectPath))) {
										PathFound = true
									}
								})

								if (!PathFound) {
									context.report({
										node: node,
										message: "In the current directory, import from {{zone }} is prohibited, since the current directory is not included in the WhiteList.",
										data: {
											zone: options.restrictedPaths
										}
									})
								}
							}
						})
					}
				}
			}
		},



		['restricted-by-current-dir']: {
			meta: {
				type: "problem",
				docs: {
					description: "Prohibits importing files that match the regular expression above the parent directory.",
					category: "Possible Errors",
					recommended: false
				},
				fixable: null,
				schema: [
					{
						type: 'array',
						items: {
							type: 'object',
							properties: {
								regExp: {
									type: 'array',
									items: { type: 'string' }
								}
							}
						}
					}
				]
			},

			create: context => {
				const currentFilename = context.getFilename()
				const options = context.options[0] || {}
				const regExp = options[0].regExp
				const getFileName = (str) => {
					return str.split('\\').pop().split('/').pop();
				}

				return {
					ImportDeclaration: node => {
						const { source } = node
						const importPath = source.value
						const absoluteImportPath = path.resolve(path.dirname(currentFilename), importPath)

						regExp.forEach(exp => {
							if (new RegExp(exp).test(getFileName(absoluteImportPath))) {
								if (!currentFilename.startsWith(path.dirname(absoluteImportPath))) {
									context.report({
										node: node,
										message: 'You can\'t import {{ value }} from the current directory.',
										data: {
											value: importPath
										}
									})
								}
							}
						})
					}
				}
			}
		},



		["restricted-zone-private-import"]: {
			meta: {
				type: "problem",
				docs: {
					description: "Prohibits importing files that match the regular expression to all directories that are not specified in the src.",
					category: "Possible Errors",
					recommended: false
				},
				fixable: null,
				schema: [
					{
						type: 'array',
						items: {
							type: 'object',
							properties: {
								name: { type: 'string' },
								src: {
									type: 'array',
									items: { type: 'strng' }
								},
								regExp: {
									type: 'array',
									items: { type: 'string' }
								}
							}
						}
					}
				]
			},

			create: context => {
				const basePath = process.cwd()
				const currentFilename = context.getFilename()
				const options = context.options[0] || {}
				
				const getFileName = (str) => {
					return str.split('\\').pop().split('/').pop();
				}
				const checkForMatch = (element) => {
					const absoluteZonePath = path.resolve(basePath, element).normalize()
					return currentFilename.startsWith(absoluteZonePath)
				}

				return {
					ImportDeclaration: node => {
						const { source } = node
						const importPath = source.value
						const absoluteImportPath = path.resolve(path.dirname(currentFilename), importPath)

						let currentSrc = []

						options.forEach(zone => {
							zone.src.forEach(src => {
								const absoluteZonePath = path.resolve(basePath, src).normalize()

								if (!absoluteImportPath.startsWith(absoluteZonePath)) {
									return
								}

								currentSrc = zone.src

								zone.filenameRegExp.forEach(exp => {
									if (!(new RegExp(exp).test(getFileName(absoluteImportPath)))) {
										return
									}

									if (currentSrc.some(checkForMatch)) {
										return
									}

									context.report({
										node: node,
										message: 'The current import {{val}} goes beyond the directories specified in the src.',
										data: {
											val: absoluteImportPath
										}
									})
								})
							})
						})

					}
				}
			}
		},
	}
}