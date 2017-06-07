
var stuff = new Vue({ // should I use Vuex?
	data: {
		filteredAlbumData: '',
	},
	methods: {
		showArtist: function(album) {
			var name = album.renderedArtists;
			if(!name || name == "Various Artists") return "Monstercat";
			else return name;
		},
		showTitle: function(album) {
			return album.title.replace(/^Monstercat( -|:)? /g, "");
		},
		isUnreleased: function(album) {
			return new Date(album.releaseDate) > new Date();
		},
		genreToClass: function(genre) {
			if(!genre) return "electronic";
			return genre.toLowerCase().replace('110', 'a110').replace(/[ &/]/g, '-');
		}
	}
});

Vue.component('loading-screen', {
	template: '#loading-screen-template',
});

var mainView = Vue.extend({
	template: '#main-view-template',
	data: function() {
		return {
			stuff: stuff,
			secondsSinceLoad: 0,

			shownResults: 0,
			totalResults: [0,0,0,0,0,0,0],

			categories: ['All', 'Compilations', 'LPs', 'EPs', 'Podcasts', 'Singles', 'Misc.'],
			type: 0,
			busy: false,

			filter: '',
			numLoad: 30,
			loadTo: [30,30,30,30,30,30,30],

			cardView: true,
		}
	},
	computed: {
		loadTimestamp: function() {
			return localStorage.browserAlbumDataTime;
		},
		loadSince: function() {
			var seconds = this.secondsSinceLoad;
			var interval = Math.floor(seconds / 31536000);

			interval = Math.floor(seconds / 86400);
			if (interval > 1) return interval + " days";

			interval = Math.floor(seconds / 3600);
			if (interval > 1) return interval + " hours";

			interval = Math.floor(seconds / 60);
			if (interval > 1) return interval + " minutes";

			return Math.floor(seconds) + " seconds";
		},
		filterByCategory: function() {
			var that = this;
			var filteredResult = that.$parent.albumData.filter(function(album) {
				if(!album.catalogId) return false;
				switch(that.type) {
					case 0:
						return true;
					case 1:
						return (album.catalogId.indexOf("MC0") > -1 || album.catalogId.indexOf("MCUV") > -1 || album.catalogId.indexOf("MCRL") > -1);
					case 2:
						return (album.catalogId.indexOf("MCLP") > -1);
					case 3:
						return (album.catalogId.indexOf("MCEP") > -1);
					case 4:
						return (album.catalogId.indexOf("MCP") > -1 || album.catalogId.indexOf("MCSP") > -1 || album.catalogId.indexOf("COTW") > -1);
					case 5:
						return (album.catalogId.indexOf("MCS") > -1 || album.catalogId.indexOf("MCF") > -1) && album.catalogId.indexOf("MCSP") < 0;
					case 6:
						return (album.catalogId.indexOf("MCB") > -1 || album.catalogId.indexOf("MCX") > -1 || album.catalogId.indexOf("MCH") > -1) && album.catalogId.indexOf("MCX004-") < 0;
					default:
						return false;
				}
			});
			Vue.set(that.totalResults, that.type, filteredResult.length);
			return filteredResult;
		},
		filterSlice: function() {
			var that = this;
			return that.filterByCategory.slice(0, that.loadTo[that.type]);
		},
		filteredAlbumData: function() {
			var that = this;
			var result = "";
			if(that.$parent.albumData.length > 0) {
				if(that.filter) {
					var searchRegex = new RegExp(that.filter, 'i');
					var filtered = that.filterSlice.filter(function(album) {
						return searchRegex.test(album.title) ||
							   searchRegex.test(album.renderedArtists) ||
							   searchRegex.test(album.catalogId);
					});
					that.shownResults = filtered.length;
					result = filtered;
				}
				else {
					that.shownResults = that.filterSlice.length;
					result = that.filterSlice;
				}
				that.stuff.filteredAlbumData = result;
				return result;
			}
		},
		infiniteScroll: function() {
			var that = this;
			return (that.busy || that.$parent.albumView);
		}
	},
	methods: {
		loadMore: function() {
			var that = this;
			if(!that.$parent.loading && !that.filter && !this.$route.params.catalogId) {
				that.busy = true;
				Vue.set(that.loadTo, that.type, Math.min(that.loadTo[that.type] + that.numLoad, that.totalResults[that.type]));
				that.busy = false;
			}
		}
	},
	watch: {
		'$route': function(to, from) {
			document.title = "Monstercat Album Browser";
		}
	},
	created: function() {
		var that = this;
		window.setInterval(function() {
			that.secondsSinceLoad = Math.floor((new Date() - localStorage.browserAlbumDataTime) / 1000);
		},1000);
	}
});

Vue.component('card', {
	props: ['album', 'card-view'],
	template: '#card-template',
	data: function() {
		return {
			stuff: stuff
		}
	},
	computed: {
		albumUnreleased: function() {
			return this.stuff.isUnreleased(this.album);
		},
		albumArtist: function() {
			return this.stuff.showArtist(this.album);
		},
		albumTitle: function() {
			return this.stuff.showTitle(this.album);
		},
		cardTitle: function() {
			var artist = this.albumArtist;
			var title = this.albumTitle;
			if(artist == "Monstercat") return this.album.title;
			else return artist + " - " + title;
		}
	}
});

var albumView = Vue.extend({
	template: '#album-view-template',
	data: function() {
		return {
			stuff: stuff,
			trackFilter: '',
			trackLoading: false,

			currentAlbum: '',
			currentAlbumTracks: {},

			currentGenre: -1,
			genres: [
				["trap"],
				["drum---bass"],
				["house"],
				["electro"],
				["hard-dance", "happy-hardcore", "hardstyle"],
				["glitch-hop", "a110-bpm", "moombahton"],
				["nu-disco", "indie-dance", "indie-dance---nu-disco", "synthwave"],
				["future-bass"],
				["trance"],
				["dubstep"],
				["drumstep"],
				["electronic", "breaks", "chillout"]
			],

			sortBy: 'index',
			sortDirection: 1, // 1 = ascending, -1 = descending
		}
	},
	computed: {
		currentAlbumData: function() {
			var that = this;
			return that.$parent.albumData.filter(function(album) {
				return album.catalogId === that.currentAlbum;
			})[0];
		},
		albumDataWithCatalogId: function() {
			var that = this;
			return that.$parent.albumData.filter(function(album) {
				return album.catalogId !== undefined;
			});
		},
		albumUnreleased: function() {
			return this.stuff.isUnreleased(this.currentAlbumData);
		},
		albumId: function() {
			var output = this.currentAlbumData.catalogId;
			if(this.albumUnreleased) output = "[Pre-Release] " + output;
			return output;
		},
		albumArtist: function() {
			return this.stuff.showArtist(this.currentAlbumData);
		},
		albumTitle: function() {
			return this.stuff.showTitle(this.currentAlbumData);
		},
		albumReleaseDate: function() {
			return new Date(this.currentAlbumData.releaseDate) + "";
		},
		currentIndex: function() {
			var that = this;
			return that.albumDataWithCatalogId.findIndex(function(album) {
				return album.catalogId === that.currentAlbum;
			});
		},
		prevCatalogId: function() {
			var that = this;
			if(that.currentIndex < that.albumDataWithCatalogId.length - 1) return that.albumDataWithCatalogId[that.currentIndex + 1].catalogId;
		},
		nextCatalogId: function() {
			var that = this;
			if(that.currentIndex > 0) return that.albumDataWithCatalogId[that.currentIndex - 1].catalogId;
		},
		genreCount: function() {
			var that = this;
			var res = [];
			for(i=0;i<that.currentAlbumTracks.length;i++) {
				track = that.currentAlbumTracks[i];
				for(j=0;j<that.genres.length;j++) {
					if(res[j] === undefined) {
						res[j] = {
							id: j,
							count: 0
						};
					}
					if(that.genres[j].indexOf(that.stuff.genreToClass(track.genres[0])) > -1)  {
						if(that.trackFilter) {
							var filter = that.trackFilter;
							if((track.title.toLowerCase().indexOf(filter) > -1 || track.artistsTitle.toLowerCase().indexOf(filter) > -1)) {
								res[j].count++;
								break;
							}
						}
						else {
							res[j].count++;
							break;
						}
					}
				}
			}
			return res;
		},
		sortedGenreCount: function() {
			var that = this;
			return that.genreCount.sort(function(a,b){
			    return b.count - a.count;
			});
		},
		sortedAlbumTracks: function() {
			var that = this;
			if(that.currentAlbumTracks.length !== undefined) {
				return that.currentAlbumTracks.sort(function(a,b){
					a = a[that.sortBy];
					b = b[that.sortBy];
					if(typeof a == "string") a = a.toLowerCase(), b = b.toLowerCase();
					if(a < b) return -1 * that.sortDirection;
					else if(a > b) return 1 * that.sortDirection;
					return 0;
				});
			}
		}
	},
	methods: {
		showTrack: function(track) {
			var that = this;
			var flag1 = true;
			var flag2 = true;

			if(that.currentGenre >= 0) {
				flag1 = that.genres[that.currentGenre].indexOf(that.stuff.genreToClass(track.genres[0])) > -1;
			}

			if(that.trackFilter) {
				var filter = that.trackFilter.toLowerCase();
				flag2 = (track.title.toLowerCase().indexOf(filter) > -1 || track.artistsTitle.toLowerCase().indexOf(filter) > -1);
			}

			return flag1 && flag2;
		},
		changeSort: function(data) {
			this.sortBy = data[0];
			this.sortDirection = data[1];
		},
		getAlbumTracklist: function(catalogId) {

			var that = this;

			that.trackLoading = true;
			that.loadingSingleAlbumData = false;
			that.currentAlbum = catalogId;
			that.currentAlbumTracks = {};
			that.trackFilter = "";
			that.currentGenre = -1;
			that.sortBy = "index";
			that.sortDirection = 1;
			document.title = "["+catalogId+"] "+that.albumArtist+" - "+that.albumTitle+" | Monstercat Album Browser";

			if(that.$parent.albumTracks[catalogId] !== undefined) {
				that.currentAlbumTracks = that.$parent.albumTracks[catalogId];
				that.trackLoading = false;
				return;
			}

			var url = "https://connect.monstercat.com/api/catalog/release/" + that.currentAlbumData._id + "/tracks";
			//var url = "mcuv.json";

			that.$http.get(url).then(function(response){
				var data = response.body;
				var result = data.results;
				for(i in result) result[i].index = +i;
				that.$parent.albumTracks[catalogId] = result;
				if(that.currentAlbum == catalogId) that.currentAlbumTracks = result;
				that.trackLoading = false;
			}, function(response) {
				alert(response.bodyText);
				that.trackLoading = false;
			});

		},
		load: function() {
			if(!this.isLoading) this.getAlbumTracklist(this.$route.params.catalogId);
		}
	},
	watch: {
		'$route': function(to, from) {
			if(this.$route.params.catalogId) this.load();
		}
	},
	created: function() {
		if(this.$route.params.catalogId) this.load();
	}
});

Vue.component('track-item', {
	props: ['track', 'trackFilter', 'index', 'sortBy', 'sortDirection'],
	template: '#track-template',
	data: function() {
		return {
			stuff: stuff
		}
	},
	computed: {
		genreClass: function() {
			return this.stuff.genreToClass(this.track.genres[0]);
		},
		trackTitle: function() {
			var title = this.track.title;
			if(this.trackFilter) {
				var filter = this.trackFilter.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
				filter = new RegExp('(' + filter + ')', 'gi');
				title = title.replace(filter, '<span class="highlight">$1</span>');
			}
			title = title.replace(/(\(((.* (Remix|Mix|VIP|Edit|Remake))|(with|Performed by|feat\.|Mixed by) .*)\)|(\[[\w \-&'.$]*\])|\(Acoustic\))/g, "<small class='track-info'>$1</small>");
			return title;
		},
		trackArtistsTitle: function() {
			var title = this.track.artistsTitle;
			if(this.trackFilter) {
				var filter = this.trackFilter.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
				filter = new RegExp('(' + filter + ')', 'gi');
				return title.replace(filter, '<span class="highlight">$1</span>');
			}
			return title;
		},
		trackDuration: function() {
			time = Math.round(this.track.duration);

			var hrs = ~~(time / 3600);
			var mins = ~~((time % 3600) / 60);
			var secs = time % 60;

			// Output like "1:01" or "4:03:59" or "123:03:59"
			var ret = "";

			if(hrs > 0) {
				ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
			}

			ret += "" + mins + ":" + (secs < 10 ? "0" : "");
			ret += "" + secs;
			return ret;
		}
	},
	methods: {
		sortTracks: function(col) {
			var that = this;
			var sortBy = that.sortBy;
			var sortDirection = that.sortDirection;

			if(sortBy == col) sortDirection *= -1;
			else {
				sortBy = col;
				sortDirection = 1;
			}
			that.$emit('sortChange', [sortBy, sortDirection]);
		},
		sortArrow: function(col) {
			var that = this;
			if(that.sortBy == col) {
				if(that.sortDirection < 0) return "up";
				else return "down";
			}
			else return "";
		}
	}
});