// Default production behavior is unchanged. Staging must opt into one exact HTTPS origin.
export function appOrigin(configured?:string):string|null {
  if(configured===undefined)return "https://isletatlas.org";
  try {
    const u=new URL(configured);
    if(u.protocol!=="https:"||u.username||u.password||u.port||u.pathname!=="/"||u.search||u.hash)return null;
    return u.origin;
  }catch{return null}
}
