import { create } from "../api.js";
/**
 * @typedef RouteOpt
 * @property {string} component
 * @property {boolean?} unmountOnLeave
 */
export class Router {
      #root = document.createElement('div');
      #map = {};
      #queue = [];
      /**
       * create new instance of a router, used to build single page applications
       * @param {Record<string,RouteOpt>} map name of the route: name of the component to use
       * @param {HTMLElement} node default document.body
       */
      constructor( map, node = document.body ){
            this.setRoot(node);
            this.map(map);
      }
      /**
       * set the root of the router
       * @param {HTMLElement} node 
       */
      setRoot(node){
            if( !(node instanceof HTMLElement) )
                  return;
            this.#root.remove();
            node.append( this.#root );
      }
      /**
       * go to the specified route if exists
       * @param {string} route 
       */
      goto(route){
            if(!this.#map[route]){
                  console.error('Router error: no route found for ', route);
                  return;
            }
            this.#queue.push( route );

            if( typeof this.#map[route] == 'string' ){
                  this.#root.replaceChildren( create( this.#map[route] ) )
                  return;
            }
            this.#root.replaceChildren(this.#map[route]);
      }
      /**
       * used to add new routes to the router
       * @param {Record<string,RouteOpt>} map 
       * @example
       * router.map({
            '/home': {
                  name: 'home-component',
                  unmountOnLeave: false
            },
       });
       */
      map(map){
            if( typeof map === 'object' ){
                  for( let [k,v] of Object.entries(map) ){
                        if( v && typeof v =='object' && 'component' in v && typeof v.component == 'string' && typeof k !== 'string' )
                              continue;
                        if( 'unmountOnLeave' in v && v.unmountOnLeave ){
                              this.#map[k] = v.component;
                              continue;
                        }
                        const el = create(v.component);
                        if( !el ){
                              console.warn('element not found ',v )
                              continue;
                        }
                        this.#map[k] = el;
                  }
            }
      }
      /**
       * go to the last visited page before the current one.
       */
      back(){
            if( this.#queue.length <= 1 )
                  return;
            this.goto( this.#queue[ this.#queue.length - 1 ] );
      }
}