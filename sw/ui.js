export const imports = Object.freeze({
      toast: 'toast',
      breadcrumb: 'breadcrumb',
      tabs: 'tabs',
      code: 'code',
      tree: 'tree',
      toggle: 'toggle',
      stringPreview: 'stringPreview',
      carousel: 'carousel',
      all: 'all',
})
export const include = ( ...args ) => {

      if( args.includes( imports.all ) ){
            for( const i of Object.keys( imports ) ){
                  if( i == imports.all ) 
                        continue;
                  try {
                        import( `./ui/${i}.js` );
                  }catch( e ) {
                        console.error( e );
                  }
            }
            return;
      }

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