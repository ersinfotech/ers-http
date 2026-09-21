const { makeExecutableSchema } = require('@graphql-tools/schema')

const { GraphQLJSONObject, GraphQLJSON } = require('./graphql-type-json')

const resolveFunctions = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
}

const buildSchema = (typeDefs, resolvers) => {
  return makeExecutableSchema({
    typeDefs,
    resolvers: {
      ...resolveFunctions,
      ...resolvers,
    },
  })
}

exports.buildSchema = buildSchema

const { graphqlHTTP, getOperationUrl } = require('./express-graphql')

exports.getOperationUrl = getOperationUrl

const scalarify = (schema) => `
scalar JSON
scalar JSONObject
scalar Date
scalar Time
scalar DateTime
${schema}
`
exports.scalarify = scalarify

const graphiql = ({ api, schema, resolver, graphi, extensions }) => {
  schema = scalarify(schema)

  schema = buildSchema(schema, resolver)

  return graphqlHTTP(async (req, res) => {
    const rootValue = typeof api === 'function' ? await api(req) : api
    const graphiql = typeof graphi === 'function' ? await graphi(req) : true

    return {
      schema,
      rootValue,
      graphiql,
      extensions,
    }
  })
}

exports.graphiql = graphiql
