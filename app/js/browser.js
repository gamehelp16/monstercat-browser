
var router = new VueRouter({
	mode: 'hash',
	base: '/',
	routes: [
		{ path: '/', component: mainView },
		{ name: 'album', path: '/:catalogId', component: albumView }
	]
	/*scrollBehavior (to, from, savedPosition) {
		if (savedPosition) return savedPosition;
	 	else return { x: 0, y: 0 };
	}*/
});

var browser = new Vue({
	el: '#app',
	router: router,
	template: '#app-template',
	data: {
		loading: true,
		albumData: {},
		albumTracks: [],
	},
	methods: {
		getAlbumData: function() {
			var that = this;
			if(localStorage.browserAlbumDataTime === undefined || Date.now() - localStorage.browserAlbumDataTime >= 24*60*60*1000) {
				var url = "https://connect.monstercat.com/api/catalog/release?fields=catalogId,title,renderedArtists,coverUrl";
				//var url = "data.json";
				that.loading = true;

				that.$http.get(url).then(function(response){
					var data = response.body;
					that.albumData = data.results;
					that.loading = false;
					localStorage.browserAlbumData = JSON.stringify(data);
					localStorage.browserAlbumDataTime = Date.now();
				}, function(response) {
					alert(response.bodyText);
					that.loading = false;
				});
			}
			else {
				var data = JSON.parse(localStorage.browserAlbumData);
				that.albumData = data.results;
				that.loading = false;
			}
		},
		reloadData: function() {
			localStorage.browserAlbumDataTime = 0;
			this.loading = true;
			this.getAlbumData();
		}
	},
	watch: {
		'$route': function(to, from) {
			ga('set', 'page', location.pathname + location.search + location.hash);
			ga('send', 'pageview');
		}
	},
	created: function() {
		this.getAlbumData();
	}
});