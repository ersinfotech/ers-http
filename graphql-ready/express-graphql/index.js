const { Source, parse, validate, execute, validateSchema } = require('graphql')
const path = require('path')
const html = path.join(__dirname, 'graphiql.html')

const respondWithGraphiQL = (res) => {
  res.sendFile(html)
}

const getParam = (req, key) => {
  return (req.query && req.query[key]) || (req.body && req.body[key])
}

const getGraphQLParams = async (req) => {
  return {
    query: getParam(req, 'query'),
    variables: getParam(req, 'variables'),
    operationName: getParam(req, 'operationName'),
  }
}

const defaultOn = async () => ({})

const graphqlHTTP = (getOptions) => async (req, res) => {
  const startTime = Date.now()
  let result

  try {
    const params = await getGraphQLParams(req)

    const {
      schema,
      rootValue,
      graphiql,
      context = req,
      extensions: { onstart = defaultOn, onfinish = defaultOn } = {},
    } = await getOptions(req, res, params)

    const showGraphiQL = graphiql && req.method === 'GET'

    if (showGraphiQL) {
      return respondWithGraphiQL(res)
    }

    const { query, variables, operationName } = params

    if (!query) {
      throw new Error('Must provide query string.')
    }

    const schemaValidationErrors = validateSchema(schema)
    if (schemaValidationErrors.length > 0) {
      throw schemaValidationErrors[0]
    }

    const documentAST = parse(new Source(query, 'GraphQL request'))

    const validationErrors = validate(schema, documentAST)
    if (validationErrors.length > 0) {
      throw validationErrors[0]
    }

    const operationUrl = getOperationUrl(documentAST, operationName)

    const extra_onstart = await onstart(
      {
        operationUrl,
      },
      {
        document: documentAST,
        variables,
        operationName,
        result,
        context,
      },
    )

    result = await execute({
      schema,
      document: documentAST,
      rootValue,
      contextValue: context,
      variableValues: variables,
      operationName,
    })

    if (Array.isArray(result.errors) && result.errors.length > 0) {
      throw result.errors[0]
    }

    const took = Date.now() - startTime

    req.graphqlUrl = operationUrl

    const extra_onfinish = await onfinish(
      {
        operationUrl,
        took,
      },
      {
        document: documentAST,
        variables,
        operationName,
        result,
        context,
      },
    )
    const extensions = {
      ...extra_onstart,
      ...extra_onfinish,
      took,
    }
    result = { ...result, extensions }
  } catch (e) {
    const debug = getParam(req, 'debug')

    const error = debug
      ? {
          message: e.message,
          stack: e.stack,
        }
      : e.message

    result = {
      data: null,
      errors: [error],
    }
    res.status(500)
  }

  res.send(result)
}

exports.graphqlHTTP = graphqlHTTP

const getOperationUrl = (document, operationName) => {
  if (!document) return

  const definitions = document.definitions.filter(
    (definition) => definition.kind === 'OperationDefinition',
  )

  if (definitions.length === 0) return

  const definition =
    definitions.find((d) => d.name && d.name.value === operationName) ||
    definitions[0]

  const selections = definition.selectionSet.selections

  if (selections.length > 5) {
    throw new Error('too much operation')
  }

  const selectionNames = selections
    .map((selection) => selection.name.value)
    .sort()
    .join(',')

  return `/${definition.operation}/${selectionNames}`
}

exports.getOperationUrl = getOperationUrl
