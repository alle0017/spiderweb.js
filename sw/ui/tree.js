import { define } from '../../api.js';

define({
      name: 'sw-tree',
      template: /*html*/`
            <ul ref="root"></ul>
            <style>
                  :host{
                        --button-hover-background: #aaa;
                        --button-width: 100px;
                  }
                  ul {
                        list-style: none;
                  }
                  li{
                        width: var(--button-width);
                        border-radius: 5px;
                        padding: 5px;
                  }
                  .highlight:hover {
                        background-color: var(--button-hover-background);
                  }
                  .collapse{
                        cursor: pointer;
                  }
                  .collapse:hover {
                        filter: brightness(50%);
                  }
            </style>
      `,
      props: {
            chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-right" viewBox="0 0 16 16">
                              <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
                        </svg>`,
            chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16">
                              <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/>
                        </svg>`,
            collapsable: true,
            set nodes( array ){
                  this._fill( array, this.refs.root );
            },
            get nodes(){
                  return this._nodes;
            },
            _createCollapseBtn( label, icon, list ){
                  const btn = document.createElement('span');
                  const wrapper = document.createElement('div');
                  const img = document.createElement('img');

                  img.src = icon;
                  img.style.paddingRight = '10px';
                  wrapper.append( btn );
                  wrapper.append( img, document.createTextNode( label ) );
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
                        }else{
                              btn.innerHTML = this.chevronRight;
                              btn.role = 'collapsed';
                              list.remove();
                              wrapper.parentNode.classList.add('highlight');
                        }
                  })
                  return wrapper;
            },
            _fill( array, root ){
                  for( const el of array ){
                        const leaf = document.createElement('li');

                        leaf.innerHTML = el.name;
                        if( el.icon ){
                              const icon = document.createElement('img');
                  
                              leaf.firstChild.before(icon);
                              icon.src = el.icon;
                              icon.style.paddingRight = '10px';
                        }
                        leaf.classList.add('highlight');
                        if( !el.children || el.children.length <= 0 ){
                              root.appendChild( leaf );
                              continue;
                        }
                        const branch = document.createElement('ul');

                        this.collapsable && leaf.replaceChildren( this._createCollapseBtn( el.name, el.icon, branch ) );
                        this._fill( el.children, branch );
                        root.appendChild( leaf );
                  }
            }
      }
})