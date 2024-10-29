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

      /**
       * 
       * @param {string} route 
       * @param {Record<string,any>} props 
       */
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
      * @param {Record<string,any>} props 
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
       * @param {Function} listener 
       */
      static addEventListener( listener ){
            //@ts-ignore
            window.addEventListener('route-enter', listener);
      }
}