export async function {{ name }} (params) {
  const { data: _data } = {{ method }}(`{{ url }}`, params)
return _data
}