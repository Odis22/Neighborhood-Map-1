
//Create map
//initial code from Udacity course project 12 and google maps place search document
var map, marker, infowindow;
var jonkoping = {lat: 57.782614, lng: 14.161788};

//add lables
var labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
var labelIndex = 0;

//array of markers
var markers = [];
//array of side list
var listElements = [];

//set requests
var requestQuery = 'hotel Jönköping';
var requestType = 'city';

//for the use with knockout binding
var data = {
  'Locations': {
    'arrLocations': []
  }
};

var viewModel = {
  location: ko.observable(),
  Locations: ko.observableArray(data.Locations.arrLocations)
};


//Create a map
function initAutocomplete() {
  var map = new google.maps.Map(document.getElementById('map'), {
    center: jonkoping,
    zoom: 13,
    radius: 1000,
    mapTypeId: 'roadmap',
    mapTypeControl: false
  });

  var placeList = document.getElementById('places');

  //Set the boundaries to fit everythign the user can see
  // It captures the South-West adn North-East corners of the viewport
  //var bounds = new google.maps.LatLngBounds();

  // bounds for text search.
  var bounds = map.getBounds();

  infowindow = new google.maps.InfoWindow();

  // Create a "highlighted location" marker color for when the user
  // mouses over the marker.
  var highlightedIcon = makeMarkerIcon('FFFF24')

  var request = {
    location: jonkoping,
    query: requestQuery,
    bounds: bounds,
    type: requestType
  };

  //set the please search service.
  var service = new google.maps.places.PlacesService(map);
  service.textSearch(request, callback);

  // Add function which clears other than the selected markers
  //Credit and ideas for knockoutJS binding: http://jsfiddle.net/53qfm5bz/1/
  viewModel.Locations.subscribe(function (newValue) {
    console.debug("changing", newValue);
    //remove old marker items
    for (var i = 0; i < markers.length; i++) {
      markers[i].setMap(null);
    }
    //remove old list view items
    for (var j = 0; j < listElements.length; j++) {
      listElements[j].style.display = "none";
    }

    var requestByUser = {
      location: jonkoping,
      bounds: bounds,
      query: newValue,
      type: newValue
    };

    //Allow to check only one box.
    //Credit to: http://stackoverflow.com/questions/29389971/select-only-one-checkbox-in-group
    $(function(){
      $("input").change(function(e) {
        if($('input:checked').length==1) {
          $("input:not(:checked)").attr("disabled", true);
        } else {
          $("input:not(:checked)").attr("disabled", false);
        }
      });
    });

    //If none of the boxes are checked - use main request with hotels (default)
    if ( $('input:checked').length > 0 ) {
      service.textSearch(requestByUser, callback);
    } else {
      service.textSearch(request, callback);
    };
  });

  //Place markers on the map
  function callback(results, status) {
    var bounds = new google.maps.LatLngBounds();
    if (status == google.maps.places.PlacesServiceStatus.OK) {
      for (var i = 0; i < results.length; i++) {
        var places = results[i];
        var icon = {
          url: places.icon,
          size: new google.maps.Size(71, 71),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(17, 34),
          scaledSize: new google.maps.Size(25, 25)
        };
        //create marker
        marker = new google.maps.Marker({
          map: map,
          icon: icon,
          animation: google.maps.Animation.DROP,
          title: places.name,
          label: labels[labelIndex++ % labels.length],
          position: places.geometry.location
        });

        //add Wikipedia information (from intro to Ajax course at Udacity)
        //Wikipedia AJAX request
        var $wikiElem = $('#wikipedia-links');
        function loadWiki(marker) {
          //clear old elements
          $wikiElem.text("");

          //encode marker title characters for url:
          var markerTitleEscape = escape(marker.title);
          //add wikipedia link + esaped marker title
          var wikiUrl = 'https://en.wikipedia.org/w/api.php?action=opensearch&search=' +
          markerTitleEscape + '&format=json&callback=wikiCallback';
          var wikiRequestTimeout = setTimeout(function(){
            window.alert("failed to get wikipedia resources");
          }, 8000);

          $.ajax({
            url: wikiUrl,
            dataType: "jsonp",
            jsonp: "callback",
            success: function( response ) {
              var articleList = response[1];
              for (var i = 0; i < articleList.length; i++) {
                articleStr = articleList[i];
                var articleStrEscape = escape(articleStr);
                var url = 'http://en.wikipedia.org/wiki/' + articleStrEscape;
                $wikiElem.append('<li id="wikiList"><a href="'
                + url + '">' + articleStr + '</a></li>');
                //notify if nothing was found.
                if (articleList.length < 1) {
                  $("#wikipedia-links").append("<li>No information from Wikipedia</li>");
                };
                clearTimeout(wikiRequestTimeout);
              };
            }
          });
          return false
        }
        //Call wikipedia information requesting function for clicked list name
        loadWiki(marker);

        //create a list of markers for a selected types of locations
        //credit to: http://googlemaps.googlermania.com/google_maps_api_v3/en/map_example_sidebar.html
        function createMarkerButton(marker) {
          var li = document.createElement('div');
          li.innerHTML = '<button type="button" class="list-group-item">'
          + marker.label + ' - ' + marker.title + '</button>';
          var listView = placeList.appendChild(li);
          //push list elements to array to use in knockout part
          listElements.push(listView);
          //Trigger marker by clicking list element
          google.maps.event.addDomListener(li, "click", function(){
            google.maps.event.trigger(marker, "click");
            li.style.cssText = "color: blue";
            //call marker animation
            toggleBounce();
            //call wikipedia requesting function to add links for current place click.
            loadWiki(marker);

            //Handle marker animation and list styles
            function toggleBounce() {
              if (marker.getAnimation() !== null) {
                marker.setAnimation(null);
              } else {
                //set temporarry bouncing
                marker.setAnimation(4, google.maps.Animation.BOUNCE);
                marker.setIcon(highlightedIcon);
              };
            }
          });
        }
        //call function that creates markers for selected locations
        createMarkerButton(marker);

        //open infowindow of clicked marker
        //REF ref.: google maps API Udacity course
        marker.addListener('click', function() {
          populateInfoWindow(this, infowindow);
        });

        // Define default icon.
        var defaultIcon = marker.icon;

        // Two event listeners - one for mouseover, one for mouseout,
        // to change the colors back and forth.
        marker.addListener('mouseover', function() {
          this.setIcon(highlightedIcon);
        });

        //Return to default marker icon at mouseout.
        marker.addListener('mouseout', function() {
          this.setIcon(defaultIcon);
        });

        //Create infowindow for marker.
        function populateInfoWindow(marker, infowindow){
          if(infowindow.marker != marker) {
            infowindow.markers = marker;
            infowindow.setContent('<div>' + marker.label + ' - ' + marker.title + '</div>');
            infowindow.open(map, marker);
            //clear marker porperty when window is closed.
            infowindow.addListener('closeclick', function() {
              infowindow.marker = null;
            });
          }
        }
        //push marker to array.
        markers.push(marker);
        // fit map to render all set markers.
        if (places.geometry.viewport) {
          // Only geocodes have viewport.
          bounds.union(places.geometry.viewport);
        } else {
          bounds.extend(places.geometry.location);
        }
      }
      //call to fit markers to map
      map.fitBounds(bounds);
    }
    return
  };


  // This function (from Udacity course) takes in a COLOR, and then creates a new marker
  // icon of that color. The icon will be 21 px wide by 34 high, have an origin
  // of 0, 0 and be anchored at 10, 34).
  function makeMarkerIcon(markerColor) {
    var markerImage = new google.maps.MarkerImage(
      'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
      '|40|_|%E2%80%A2',
      new google.maps.Size(21, 34),
      new google.maps.Point(0, 0),
      new google.maps.Point(10, 34),
      new google.maps.Size(21,34));
      return markerImage;
    }
  };

  //Notify on array changes for knockout part
  viewModel.Locations.notifySubscribers();
  //apply bindings
  ko.applyBindings(viewModel);
  //Open side list
  $(document).ready(function() {
    $('[data-toggle=offcanvas]').click(function() {
      $('.row-offcanvas').toggleClass('active');
    });
  });
  // open dropdown button
  $('.dropdown-toggle').dropdown()
