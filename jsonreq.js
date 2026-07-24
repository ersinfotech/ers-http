const jsonreq = ({ url, json }) =>
  fetch(
    url,
    json === undefined
      ? {
          method: 'GET',
        }
      : {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(json),
        },
  ).then((res) => res.json())

module.exports = jsonreq
