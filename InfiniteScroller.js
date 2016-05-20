import React, {Component} from 'react';
import _ from 'underscore';

export default class InfiniteScroller extends Component {
	static propTypes = {
		elements        : React.PropTypes.array,
		pageAtTop       : React.PropTypes.number,
		pageAtBottom    : React.PropTypes.number,
		loadBuffer      : React.PropTypes.number,
		enable          : React.PropTypes.bool,
		isLastResult    : React.PropTypes.bool,
		loadMore        : React.PropTypes.func,
		loadPrev        : React.PropTypes.func
	};

	constructor(props) {
		super(props);

		const pageAtTop    	= props.pageAtTop || 1;
		const pageAtBottom 	= props.pageAtBottom || pageAtTop;
		const loadBuffer 	  = props.loadBuffer || 3; // load next set of results when 3rd or 3rd last elem in viewport

		this.state = {
		  pageAtTop       : pageAtTop,
		  pageAtBottom    : pageAtBottom,
		  loadBuffer      : loadBuffer,
		  loaderAtTop 	  : false,
		  enable          : props.enable, // can enable / disable listening on scroll
		  lastElem        : null          // to detect scroll position of last elem if list elems are prepended
		}
		this.scrollListener = this.scrollListener.bind(this);
		window.scrollTo(0, 0);// by default take on top
	}

	componentWillReceiveProps(newProps){
		if(this.shouldComponentUpdate(newProps)){ // since same logic, re-using shouldComponentUpdate
			this.retainPreviousPosition(newProps);
			this.toggleListeners(newProps);
		}
	}

	shouldComponentUpdate(newProps){
		const hasNewPage 	= isPageChanged(this.props,newProps);
		const hasNewItems 	= (this.props.elements.length !== newProps.elements.length);

		return hasNewPage || hasNewItems;
	}

	retainPreviousPosition(newProps){
		const isPageAtTopChanged    = (newProps.pageAtTop < this.state.pageAtTop);
		const isPageAtBottomChanged = (newProps.pageAtBottom > this.state.pageAtBottom);
		const hasPrevPages          = (newProps.pageAtTop  > 1 && !this.state.lastElem);

		if(isPageAtTopChanged || hasPrevPages){
			this.setState({pageAtTop:newProps.pageAtTop});
			if(this.state.lastElem){
				const prevPosition = this.state.lastElem.offsetTop;
				this.scrollToPos(0,prevPosition);
			}
		}
		if(isPageAtBottomChanged){
			this.setState({pageAtBottom: newProps.pageAtBottom});
		}
	}

	toggleListeners(newProps){
		const isAllItemsLoaded = (newProps.isLastResult && this.state.pageAtTop === 1);

		if(isAllItemsLoaded){ // in DOM
			this.detachScrollListener();
		}else if(!this.state.enable){
			this.attachScrollListener();
		}
	}

	scrollToPos(x, y){
		this.detachScrollListener();
		window.scrollTo(x, y);
		this.attachScrollListener();
	}

	componentDidMount(){
		this.attachScrollListener();
	}

	componentWillUnmount(){
		this.detachScrollListener();
	}

	attachScrollListener(){
		this.debncScrollListener = _.debounce(this.scrollListener,100);

		window.addEventListener('scroll', this.debncScrollListener);
		window.addEventListener('resize', this.debncScrollListener);
		this.setState({enable:true});
	}

	detachScrollListener(){
		window.removeEventListener('scroll', this.debncScrollListener);
		window.removeEventListener('resize', this.debncScrollListener);
		this.setState({enable:false});
	}

	getScrollDirection(){
		let direction = 'down';

		if (this.prevWindowScrollY && this.prevWindowScrollY > window.scrollY){
			direction = 'up';
		}

		return direction;
	}

	scrollListener(){
		const elems = this.props.elements;

		if (elems.length > 0){
			const firstElem         =  elems[0]; // firstElem will not be available on componentDidMount, and will change if elements are prepended. Therefore have to calculate each time
			const lastElem          =  elems[elems.length - this.state.loadBuffer];
			const bottom            =  window.scrollY + window.outerHeight;
			const direction         =  this.getScrollDirection(); // down / up
			const isBottomReached   =  (direction === 'down' && bottom > lastElem.offsetTop);
			const isTopReached      =  (!isBottomReached && (this.state.pageAtTop!== 1) && (direction === 'up' && (window.scrollY - firstElem.offsetTop) < (firstElem.offsetHeight * this.state.loadBuffer)));

			if(isBottomReached){
				this.props.loadMore(this.state.pageAtBottom);
				this.setState({lastElem : lastElem});
			}else if (isTopReached){
				this.props.loadPrev(this.state.pageAtTop);
				this.setState({lastElem : firstElem});
				this.setState({loaderAtTop : true});
			}
			this.prevWindowScrollY  =  (window.scrollY); // to track scroll direction
		}else{
			this.setState({enable:false});
		}
	}

	render() {
		const {isLastResult, enable} = this.props;
		const isFirstPage = this.state.pageAtTop === 1;

		return (
			<div className="infinite-wrapper">
				{!isFirstPage &&
        			<div className="loading-list"><div className="loading-list-icon"></div>Loading...</div>
        }

				{this.props.elements.length > 0 && this.props.elements}

				{!isLastResult &&
        			<div className="loading-list"><div className="loading-list-icon"></div> Loading...</div>
        }
			</div>
		);
	}
};

function isPageChanged(prevProps, newProps){
	const isPageAtTopChanged 	  = (prevProps.pageAtTop !== newProps.pageAtTop);
	const isPageAtBottomChanged = (prevProps.pageAtBottom !== newProps.pageAtBottom);

	return (isPageAtTopChanged || isPageAtBottomChanged);
}
