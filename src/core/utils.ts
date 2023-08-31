// transform url to request path
// e.g. /user/{id} => `/user/${id}`
export function urlToRequestPath(url: string) {
  return url
    .split('/')
    .map((item) => {
      if (/{.*?}/g.test(item)) {
        return `$${item}`
      }
      return item
    })
    .join('/')
}

export function getDynamicParams(url: string) {
  const params = url.match(/\${.*?}/g)
  if (!params) return []
  return params.map((item) => item.replace(/\${|}/g, ''))
}
