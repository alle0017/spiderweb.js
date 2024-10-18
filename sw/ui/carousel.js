import { define } from "../../api.js";

define({
      name: 'sw-carousel',
      template: /*html*/`
            <div id="root">
                  <svg @click="this.move( this.right )" id="backward" class="nav-btn" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-compact-left" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M9.224 1.553a.5.5 0 0 1 .223.67L6.56 8l2.888 5.776a.5.5 0 1 1-.894.448l-3-6a.5.5 0 0 1 0-.448l3-6a.5.5 0 0 1 .67-.223"/>
                  </svg>
                  <div id="frame" ref="frame">
                        <div id="item-container" ref="itemContainer"></div>
                  </div>
                  <svg @click="this.move( this.left )" ref="forward" id="forward" class="nav-btn" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-compact-right" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M6.776 1.553a.5.5 0 0 1 .671.223l3 6a.5.5 0 0 1 0 .448l-3 6a.5.5 0 1 1-.894-.448L9.44 8 6.553 2.224a.5.5 0 0 1 .223-.671"/>
                  </svg>
            </div>
            <style>
                  :host{
                        --width: 500px;
                        --height: 300px;
                        --frame-width: 300px;
                        --frame-height: 300px;
                        --padding: 0;
                        --background-color: #000;
                        --button-width: 30px;
                        --button-height: 30px;
                        --button-border-radius: 50%;
                        --hover-color: #222;
                        --button-symbol-color: #fff;
                        --button-padding: 3%;
                  }
                  #root {
                        padding: var(--padding);
                        width: var(--width);
                        height: var(--height);
                        background-color: var(--background-color);
                  }
                  #frame {
                        float: left;
                        width: var(--frame-width);
                        height: var(--frame-height);
                        margin-left: 3%;
                        overflow: hidden;
                  }
                  #item-container {
                        display: block;
                        min-width: var(--frame-width);
                        height: var(--frame-height);
                        position: relative;
                        left: calc( 0px - var(--frame-width) );
                        transition: left 0.5s linear;
                  }
                  .nav-btn {
                        float: left;
                        width: var(--button-width);
                        height: var(--button-height);
                        border-radius: var(--button-border-radius);
                        font-size: var(--button-font-size);
                        color: var(--button-symbol-color);
                        padding: var(--button-padding);
                        margin-top: calc( var(--height)/2 - var(--button-width) );
                        margin-left: 5%;
                  }
                  .nav-btn:hover{
                        background-color: var(--hover-color);
                  }
                  carousel-item {
                        width: var(--frame-width);
                        height: var(--frame-height);
                        overflow: hidden;
                        float: left;
                  }
            </style>
      `,
      props: {
            cursor: 0,
            childrenCount: 0,
            left: 1,
            right: -1,
            recursive: true,
            move( direction ){
                  this.cursor += direction;
                  if( this.cursor < 0 || this.cursor > this.childrenCount - 1 ){
                        if( this.recursive ){

                              if( this.cursor <= 0 ){
                                    this.cursor = this.childrenCount;
                              }else{
                                    this.cursor = -1;
                              }

                              this.refs.itemContainer.style.transition = 'none';
                              this.refs.itemContainer.style.left = `calc(${-this.cursor}*var(--frame-width) - var(--frame-width))`;
                              this.cursor += direction;

                              setTimeout( ()=>{
                                    this.refs.itemContainer.style.transition = 'left 0.5s linear';
                                    this.refs.itemContainer.style.left = `calc(${-this.cursor}*var(--frame-width) - var(--frame-width) )`;
                              }, 50 );
                              
                        }else{
                              this.cursor -= direction;
                        }
                        return;
                  }
                  this.refs.itemContainer.style.left = `calc(${-this.cursor}*var(--frame-width) - var(--frame-width) )`;
            },
            onenter(){
                  const list = [...this.children]
                  for( let i = 0; i < list.length; i++ ){

                        list[i].remove();
                        if( list[i].nodeName.toLowerCase() === 'carousel-item' ){
                              this.childrenCount++;
                              this.refs.itemContainer.append( list[i] );
                        }
                  }

                  if( list.length >= 2 ){
                        this.refs.itemContainer.firstChild.before( list[ list.length - 1 ].cloneNode(true) );
                        this.refs.itemContainer.append( list[ 0 ].cloneNode(true) );
                  }
                  this.refs.itemContainer.style.width = `calc(var(--frame-width)*(${this.childrenCount} + 2))`;
            },
      }
})