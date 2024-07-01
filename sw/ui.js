export const imports = Object.freeze({
      toast: 'toast',
      breadcrumb: 'breadcrumb',
      tabs: 'tabs',
      code: 'code',
      tree: 'tree',
})
export const include = ( ...args ) => {
      for( const arg of args ) {
            if( typeof arg !== 'string' || !imports[arg] )
                  continue;
            try {
                  import( `./ui/${arg}.js` );
            }catch( e ) {
                  console.error( e );
            }
      } 
}