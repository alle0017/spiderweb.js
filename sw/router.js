/**
 * @typedef RouteOpt
 * @property {string} component
 * @property {boolean?} unmountOnLeave
 */

/**
 * static class used to navigate between virtual routes
 */
export class Router {

      static #routeMap = null;
      static #root = document.body;
      static #stateID = 0;
      static #current = {
            template: undefined,
            state: 0,
            route: '/',
      }

      static get route(){
            return this.#current.route;
      }

      static get root(){
            return this.#root;
      }
      static set root( value ){
            if( value == this.#root )
                  return;
            if( !(value instanceof HTMLElement ) ){
                  console.warn(`[router] root must be an HTML element`);
                  return;
            }

            this.#root = value;

            if( this.#current.template ){
                  this.#current.template.remove();
                  this.#root.appendChild( this.#current.template );
            }
      }

      static #goto( route, props ){
            const previousRoute = this.#current.route;
            this.#current.route = route;
            this.#current.template && this.#current.template.remove();

            if( this.#routeMap[ route ] instanceof HTMLElement ){
                  this.#current.template = this.#routeMap[ route ];
            }else{
                  this.#current.template = document.createElement( this.#routeMap[ route ] );
            }

            const entries = Object.entries( props );

            for( let i = 0; i < entries.length; i++ ){
                  this.#current.template[entries[i][0]] = entries[i][1];
            }

            this.#root.appendChild( this.#current.template );

            window.dispatchEvent( new CustomEvent('route-enter', { 
                  detail: {
                        previousRoute,
                        route,
                        props,
                  } 
            }));
      }

     /**
      * go to the specified route
      * @param {string} route
      */
      static push( route, props ){
            if( !this.#routeMap[ route ] ){
                  console.warn(`[router] route ${route} does not exist`);
                  return;
            }

            props = typeof props == 'object'? props: {};

            history.pushState({
                  props, 
                  __stateID__: this.#stateID 
            }, '', route  );  
            this.#current.state = this.#stateID;

            this.#stateID++;
            this.#goto( route, props );
      }
      /**
       * go to the last visited route
       */
      static pop(){
            history.back();
      }
      /**
       * add new routes to the router
       * @param {Object.<string, RouteOpt>} map 
       */
      static map( map ){

            if( !this.#routeMap ){
                  window.addEventListener('popstate', e =>{
                        this.#current.state = e.state.__stateID__;
                        this.#goto( location.pathname, e.state.props );
                  });
                  this.#routeMap = {};
            }

            if( typeof map !== 'object' ){
                  console.warn(`[router] map parameter must be an object of type <string, { component: string, unmountOnLeave?: boolean }>`);
                  return;
            }

            for( let [k,v] of Object.entries(map) ){
                  if( v && typeof v =='object' && 'component' in v && typeof v.component == 'string' && typeof k !== 'string' ){
                        console.warn(`[router] ${v} is of the wrong type. it must be typeof \n{\n component: string\n, unmountOnLeave?: boolean \n}`)
                        continue;
                  }

                  if( k[0] != '/' ){
                        console.warn(`[router] route's name must start with a slash ('/'). route ${k} ignored`);
                        continue;
                  }
                  if( 'unmountOnLeave' in v && v.unmountOnLeave ){
                        this.#routeMap[k] = v.component;
                        continue;
                  }
                  const el = document.createElement(v.component);
                  if( !el ){
                        console.warn(`[router] component named ${v.component} doesn't exist` );
                        continue;
                  }
                  this.#routeMap[k] = el;
            }
      }
      /**
       * removes the routes from the router.
       * @param {string[]} routes 
       */
      static unmap( routes ){}
      /**
       * 
       * @param {string} event 
       * @param {Function} listener 
       */
      static addEventListener( listener ){
            window.addEventListener('route-enter', listener);
      }
}

/**
 * /**
 * @typedef RouteOpt
 * @property {string} component
 * @property {boolean?} unmountOnLeave
 */

/**
 * static class used to navigate between virtual routes
 *
export class Router {

      static #routeMap = null;
      static #stack = [];
      static #root = document.body;
      /**@type {HTMLElement} *
      static #current;
      static #currentRoute = '';
      static #enterCallbacks = [];
      static #stateID = 0;

      static get route(){
            return this.#currentRoute;
      }

      static get root(){
            return this.#root;
      }
      static set root( value ){
            if( value == this.#root )
                  return;
            if( !(value instanceof HTMLElement ) ){
                  console.warn(`[router] root must be an HTML element`);
                  return;
            }

            this.#root = value;

            if( this.#current ){
                  this.#current.remove();
                  this.#root.appendChild( this.#current );
            }
      }

     /**
      * go to the specified route
      * @param {string} route
      *
      static push( route, props ){

            if( !this.#routeMap[route] ){
                  console.warn(`[router] no route found for ${route}`);
                  history.back();
                  return;
            }

            history.pushState( {
                  state: this.#stateID,
            }, "", route );
            this.#stateID++;

            this.#stack.push({
                  path: route
            });

            this.#currentRoute = route;

            if( this.#routeMap[route] instanceof HTMLElement ){
                  this.#current && this.#current.remove();
                  this.#root.appendChild( this.#routeMap[route] );
                  this.#current = this.#routeMap[route];
            }else{
                  this.#current && this.#current.remove();
                  this.#current = document.createElement( this.#routeMap[route] );
                  this.#root.appendChild( this.#current );
            }

            if( props && typeof props == 'object' ){
                  const entries = Object.entries( props );

                  for( let i = 0; i < entries.length; i++ ){
                        this.#current[entries[i][0]] = entries[i][1];
                  }
                  this.#stack[this.#stack.length - 1].props = props;
            }

            this.#enterCallbacks.forEach( f => f( route ) );
      }
      /**
       * go to the last visited route
       *
      static pop(){
            if( this.#stack.length < 1 ){
                  console.warn(`[router] no route to pop`);
                  return;
            } 
            this.#stack.pop();

            if( this.#stack.length > 0 ){
                  const route = this.#stack[ this.#stack.length - 1 ].path;

                  this.#currentRoute = route;
                  history.back();

                  if( this.#routeMap[route] instanceof HTMLElement ){
                        this.#current && this.#current.remove();
                        this.#root.appendChild( this.#routeMap[route] );
                        this.#current = this.#routeMap[route];
                  }else{
                        this.#current && this.#current.remove();
                        this.#current = document.createElement( this.#routeMap[route] );
                        this.#root.appendChild( this.#current );
                  }
                  if( this.#stack[ this.#stack.length - 1 ].props ){
                        const entries = Object.entries( this.#stack[ this.#stack.length - 1 ].props );
      
                        for( let i = 0; i < entries.length; i++ ){
                              this.#current[entries[i][0]] = entries[i][1];
                        }
                  }
                  this.#enterCallbacks.forEach( f => f( route ) );
            }else{
                  this.#current.remove();
                  this.#current = undefined;
                  this.#currentRoute = '';
            }

      }
      /**
       * add new routes to the router
       * @param {Object.<string, RouteOpt>} map 
       *
      static map( map ){

            if( !this.#routeMap ){
                  window.addEventListener('popstate', e =>{
                        console.log( e )
                  });
                  this.#routeMap = {};
            }

            if( typeof map !== 'object' ){
                  console.warn(`[router] map parameter must be an object of type <string, { component: string, unmountOnLeave?: boolean }>`);
                  return;
            }

            for( let [k,v] of Object.entries(map) ){
                  if( v && typeof v =='object' && 'component' in v && typeof v.component == 'string' && typeof k !== 'string' ){
                        console.warn(`[router] ${v} is of the wrong type. it must be typeof \n{\n component: string\n, unmountOnLeave?: boolean \n}`)
                        continue;
                  }

                  if( k[0] != '/' ){
                        console.warn(`[router] route's name must start with a slash ('/'). route ${k} ignored`);
                        continue;
                  }
                  if( 'unmountOnLeave' in v && v.unmountOnLeave ){
                        this.#routeMap[k] = v.component;
                        continue;
                  }
                  const el = document.createElement(v.component);
                  if( !el ){
                        console.warn(`[router] component named ${v.component} doesn't exist` );
                        continue;
                  }
                  this.#routeMap[k] = el;
            }
      }
      /**
       * removes the routes from the router.
       * @param {string[]} routes 
       *
      static unmap( routes ){

            for( let i = 0; i < routes.length; i++ ){
                  this.#routeMap[ routes[ i ] ] = undefined;
            }

            this.#stack = this.#stack.filter( v => !routes.includes( v.path ) );

            if( routes.includes( this.#currentRoute ) && this.#stack.length > 0 ){
                  this.push( this.#stack[ this.#stack.length - 1 ].path, this.#stack[ this.#stack.length - 1 ].props );
            }else if( this.#stack.length <= 0 ){
                  this.#currentRoute = '';
                  this.#current.remove();
                  this.#current = undefined;
            }
      }

      static onRouteEnter( callback ){
            if( typeof callback !== 'function' )
                  return;
            this.#enterCallbacks.push( callback );
      }
}
 */