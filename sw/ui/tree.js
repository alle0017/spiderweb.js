import { define } from '../../api.js';

define({
      name: 'sw-tree',
      template: /*html*/`
            <ul ref="root" id="{{this.orientation}}"></ul>
                              <style>
                  :host{
                        --button-hover-background: #aaa;
                        --button-width: 100px;
                        --button-margin: 0;
                        --icon-width: 40px;
                        --icon-height: 40px;
                        --icon-filter: none;
                        --icon-hover-resize: 0px;
                        --vertical-rule: 2px solid #000;
                  }
                  ul {
                        list-style: none;
                        margin-block-start: 0;
                        margin-block-end: 0;
                        padding-inline-start: 0;
                        user-select: none;
                        border-left: var(--vertical-rule);

                  }
                  #horizontal > li {
                        float: left;
                  }
                  li{
                        user-select: none;
                        width: var(--button-width);
                        border-radius: 5px;
                        padding: 5px;
                        margin: var(--button-margin);
                  }
                  .highlight:hover {
                        cursor: pointer;
                        background-color: var(--button-hover-background);
                  }
                  .collapse{
                        cursor: pointer;
                        user-select: none;
                  }
                  .collapse:hover {
                        filter: brightness(50%);
                  }
                  img {
                        width: var(--icon-width);
                        height: var(--icon-height);
                        filter: var(--icon-filter);
                        user-select: none;
                  }
                  img:hover {
                        width: calc( var(--icon-width) + var(--icon-hover-resize) );
                        height: calc( var(--icon-height) + var(--icon-hover-resize) );
                  }
            </style>
      `,
      props: {
            _nodes: [],
            chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-right" viewBox="0 0 16 16">
                              <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
                        </svg>`,
            chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16">
                              <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/>
                        </svg>`,
            collapsable: true,
            set nodes( array ){
                  if( this._nodes ){
                        this.refs.root.innerHTML = '';
                  }
                  this._nodes = array;
                  this._fill( array, this.refs.root );
            },
            get nodes(){
                  return this._nodes;
            },
            _createCollapseBtn( label, icon, list, title ){
                  const btn = document.createElement('span');
                  const wrapper = document.createElement('div');
                  wrapper.append( btn );

                  if( icon ){
                        const img = document.createElement('img');

                        img.src = icon;
                        img.style.paddingRight = '10px';
                        wrapper.append( img );
                  }
                  
                  wrapper.append( document.createTextNode( label ) );
                  wrapper.style.display = 'flex';
                  wrapper.style.alignItems = 'center';
                  btn.innerHTML = this.chevronRight;
                  btn.role = 'collapsed';
                  btn.style.paddingRight = '10px'
                  btn.style.fontSize = '30px';
                  btn.classList.add('collapse');

                  btn.addEventListener('click', ()=>{
                        if( btn.role === 'collapsed' ){
                              btn.innerHTML = this.chevronDown;
                              btn.role = 'expanded';
                              wrapper.after(list);
                              wrapper.parentNode.classList.remove('highlight');
                              this.$emit('expanded', {
                                    name: label,
                                    title,
                              });
                        }else{
                              btn.innerHTML = this.chevronRight;
                              btn.role = 'collapsed';
                              list.remove();
                              wrapper.parentNode.classList.add('highlight');
                              this.$emit('collapsed', {
                                    name: label,
                                    title,
                              });
                        }
                  })
                  return wrapper;
            },
            _fill( array, root ){
                  for( const el of array ){
                        const leaf = document.createElement('li');

                        if( typeof el == 'string'){
                              leaf.innerHTML = el;
                              continue;
                        }

                        if( el.title )
                              leaf.title = el.title;

                        if( el.clickEvent ){
                              leaf.addEventListener( 'click', (e)=>{
                                    e.stopPropagation();
                                    el.clickEvent(e);
                              })
                        }

                        leaf.innerHTML = el.name;
                        if( el.icon ){
                              const icon = document.createElement('img');
                  
                              leaf.firstChild.before(icon);
                              icon.src = el.icon;
                              icon.style.paddingRight = '10px';
                        }
                        leaf.classList.add('highlight');
                        if( !el.children ){
                              root.appendChild( leaf );
                              continue;
                        }
                        const branch = document.createElement('ul');

                        this.collapsable && leaf.replaceChildren( this._createCollapseBtn( el.name, el.icon, branch, el.title ) );
                        this._fill( el.children, branch );
                        root.appendChild( leaf );
                  }
            },
      }     
})