(function(swtr) {

  //TODO: find a better way to init.
  //Find a better way to do closure
  //Remove script code from the HTML page
  swtr.init = function() {
    swtr.sweets = new ImgAnnoSwts();
    swtr.appView = new AppView();
    swtr.who = 'Guest';
  };

  /* Model for Image Annotation Sweets */
  var ImgAnnoSwt = Backbone.Model.extend({
    defaults: {
      'who': '',
      'what': 'img-anno',
      'where': '',
      'how': {}
    },
    initialize: function() {
      if(!_.has(this, 'id')) {
        // bad hack to have dates.. FIXIT
        this.set('created', new Date().toUTCString().substr(0, 25));
      }
    }
  });

  /* Collection to hold all multiple ImgAnnoSwt */
  var ImgAnnoSwts = Backbone.Collection.extend({
    model: ImgAnnoSwt,
    url: function() {
      return swtr.swtstoreURL() + '/sweets';
    },
    // get all sweets/annotations of type #img-anno for a particular URI
    // (where)
    // @options is a javascript object,
    // @options.where : URI of the resource for which swts to be fetched
    // @options.who: optional username to filter sweets
    // @options.success: success callback to call
    // @options.error: error callback to call
    getAll: function(options) {
      // error checking
      if(!options.where) {
        throw Error('"where" option must be passed to get sweets of a URI');
        return false;
      }
      // setting up params
      var where = options.where,
          who = options.who || null;
          url = swtr.swtstoreURL() + swtr.endpoints.get + '?where=' + where;
      if(who) {
        url += '&who=' + who;
      }
      // get them!
      this.sync('read', this, {
        url: url,
        success: function() {
          if(typeof options.success === 'function') {
            options.success.apply(this, arguments);
          }
        },
        error: function() {
          if(typeof options.error === 'function') {
            options.error.apply(this, arguments);
          }
        }
      });
    },
    // post newly created sweets to a sweet store
    // @options is a javascript object,
    // @options.where : URI of the resource for which swts to be fetched
    // @options.who: optional username to filter sweets
    // @options.success: success callback to call
    // @options.error: error callback to call,
    post: function(options) {
      var new_sweets = this.getNew();
      var dummy_collection = new Backbone.Collection(new_sweets);

      this.sync('create', dummy_collection, {
        url: swtr.swtstoreURL() + swtr.endpoints.post,
        success: function() {
          if(typeof options.success === 'function') {
            options.success.apply(this, arguments);
          }
        },
        error: function() {
          if(typeof options.error === 'function') {
            options.error.apply(this, arguments);
          }
        }
      });
    },
    // return newly created models from the collection
    getNew: function() {
      var new_models = [];
      this.each(function(model) {
        if(model.isNew()) {
          new_models.push(model);
        }
      });
      return new_models;
    },
    // update part of the collection after a save on the server
    update: function() {
    }
  });

  var SweetsView = Backbone.View.extend({
    el: $('#sweet-list-wrapper'),
    events: {
      'click #sweet-cancel': 'cancelSweeting',
      'click #post-sweet': 'postSweets'
    },
    initialize: function() {
      this.template = _.template($('#sweet-template').html());
    },
    render: function() {
      $('#sweet-list').html('<h4>These are your sweet annotations!</h4>');
      _.each(this.collection.models, function(swt) {
        if(swt.has('id')) {
          return false;
        }
        $('#sweet-list').append(this.template({
          who: swt.get('who'),
          what: swt.get('what'),
          where: swt.get('where'),
          how: JSON.stringify(swt.get('how').text)
        }));
      }, this);
      $(this.el).fadeIn(300);
    },
    cancelSweeting: function() {
      this.removeSwtsNotPosted();
      this.cleanUp();
    },
    removeSwtsNotPosted: function() {
      var notPosted = this.collection.filter(function(model) {
        return !model.has('id');
      });
      this.collection.remove(notPosted);
    },
    postSweets: function() {
      swtr.appView.helpview.step(5);
      swtr.appView.$overlay.show();
      this.collection.post({
        success: function(collection, response) {
          //console.log(collection, response);
          swtr.sweets.update(collection);
          //TODO: move this to a annotation view or something
          anno.removeAll();
          _.each(swtr.sweets.models, function(swt) {
            swt.get('how')['editable'] = false;
            anno.addAnnotation(swt.get('how'));
          });
          //console.log(swtr.sweets.toJSON());
          swtr.appView.$overlay.hide();
          swtr.appView.helpview.step(6);
        },
        error: function(jqxhr, error) {
          console.log(jqxhr, error);
        }
      });
      this.cleanUp();
    },
    cleanUp: function() {
      console.log('cleaning up');
      $(this.el).hide();
    }
  });

  var AppView = Backbone.View.extend({
    el: $('#swt-maker'),
    events: {
      'click #img-url-submit': 'setImage',
      'click #sweet': 'sweet'
    },
    initialize: function() {
      //var allElements = $('body *');
      this.helpview = new HelpView();
      this.sweetsview = new SweetsView({collection: swtr.sweets});
      anno.addHandler('onAnnotationCreated', this.showSwtHelp);
      anno.addHandler('onAnnotationUpdated', this.showSwtHelp);
      this.$overlay = $('#app-overlay');
      this.$img = $('#annotatable-img');
      this.imgURL = this.$img.attr('src');
      if(this.imgURL) {
        this.initImageAnno();
        $('#img-url-input').val(this.imgURL);
      }
      else {
        this.helpview.step(1);
      }
    },
    setImage: function() {
      anno.reset();
      this.imgURL = $('#img-url-input').val();
      this.$overlay.show();
      this.helpview.step(7);
      this.$img.attr('onload', function() {
        swtr.appView.$overlay.hide();
      });
      this.$img.attr('src', this.imgURL);
      this.initImageAnno();
      return false;
    },
    initImageAnno: function() {
      // img is a jquery object which annotorious doesn't accept; instead it
      // takes the native object returned by a browser API; fortunately, jqeury
      // stores a copy of the native object too!
      anno.makeAnnotatable(this.$img[0]);
      this.getExistingAnnotations();
    },
    getExistingAnnotations: function() {
      this.helpview.step(0);
      this.$overlay.show();
      console.log('getting existing annotations of ', this.imgURL);
      swtr.sweets.getAll({
        where: this.imgURL,
        success: function(data) {
          if(_.isArray(data)) {
            swtr.sweets.add(data);
            _.each(data, function(swt) {
              swt.how['editable'] = false;
              swt.how.text+= '\n - by ' + swt.who;
              anno.addAnnotation(swt.how);
            });
            swtr.appView.$overlay.hide();
            swtr.appView.helpview.step(2);
          }
        },
        error: function(jqxhr, error, statusText) {
          if(jqxhr.status === 404) { //annotations don't exist for this image
            console.log('annotations don\'t exist for this image. Create one!');
          }
          swtr.appView.$overlay.hide();
          swtr.appView.helpview.step(2);
        }
      });
    },
    showSwtHelp: function(annotation) {
      var self = swtr.appView;//TODO: figure out how we can bind the scope when this func is called as a callback
      self.helpview.step(3);
      $('#sweet').show();
    },
    getSweets: function() {
      var annos = _.filter(anno.getAnnotations(), function(anno) {
        return (!_.has(anno, 'editable') || anno.editable === true);
      });
      _.each(annos, function(anno) {
        swtr.sweets.add({
          who: swtr.who,
          where: anno.src,
          how: anno
        });
      });
    },
    showSweets: function() {
      this.sweetsview.render();
    },
    sweet: function() {
      this.getSweets();
      this.showSweets();
      return false;
    }
  });

  var HelpView = Backbone.View.extend({
    el: $('#helpview'),
    events: {
    },
    initialize: function() {
    },
    //TODO: move from number based steps to something else. number based steps
    //implicitly imply sequential processing..which does not happen in this
    //case..
    //following helps can be async..
    step: function(n) {
      var text = '';
      switch (n) {
        case 0 : text = 'Getting annotations..';
                 break;
        case 1: text = 'Enter the URL of an image below, and start annotating!';
                break;
        case 2: text = 'Annotate the image, or see other annotations';
                break;
        case 3: text = 'Now you can sweet this annotation.';
                break;
        case 4: text = 'Click button to sweet these sweet annotations';
                break;
        case 5: text = 'Publishing your sweets';
                break;
        case 6: text = 'Sweets successfully posted';
                break;
        case 7: text = 'Fetching your image..';
                break;
      }
      $(this.el).html(text);
    }
  });

  // utilities and helper functions to go here
  swtr.utils = {};

  swtr.AppView = AppView;
})(swtr);
