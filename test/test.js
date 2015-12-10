/*
  NOTE: these tests have been (mostly) compiled by coffee-script.
  We require minimal ES6 syntax so we can take advantage
  of the way modules are structured in `lib/`.
  These tests are temporary and will eventually be translated
  to the AVA test runner pending an update to support Babel 6.0.
 */

import chai from 'chai';
import chai_promise from 'chai-as-promised'
import mockery from 'mockery'
import path from 'path'
import RootsUtil from 'roots-util'
import roots_contentful from '../lib'
import Roots from 'roots'
import S from 'string'
import W from 'when'
import _ from 'lodash'

let _path = path.join(__dirname, './fixtures')
let h = new RootsUtil.Helpers({ base: _path })

var should = chai.should();
chai.use(chai_promise);

function compile_fixture(fixture_name, done) {
  this["public"] = path.join(fixture_name, 'public');
  return h.project.compile(Roots, fixture_name);
};

function mock_contentful(opts) {
  if (opts == null) {
    opts = {};
  }
  mockery.enable({
    warnOnUnregistered: false,
    useCleanCache: true
  });
  opts = _.defaults(opts, {
    entries: [
      {
        sys: {
          sys: 'data'
        },
        fields: {
          title: 'Default Title',
          body: 'Default Body'
        }
      }
    ],
    content_type: {
      name: 'Blog Post',
      displayField: 'title'
    }
  });
  return mockery.registerMock('contentful', {
    createClient: function() {
      return {
        contentType: function() {
          return W.resolve(opts.content_type);
        },
        entries: function() {
          return W.resolve(opts.entries);
        }
      };
    }
  });
};

function unmock_contentful() {
  mockery.deregisterAll();
  return mockery.disable();
};

before(function(done) {
  return h.project.install_dependencies('*', done);
});

after(function() {
  return h.project.remove_folders('**/public');
});

describe('config', function() {
  before(function() {
    this.title = 'Gatorade';
    this.body = 'Yung Lean';
    return mock_contentful({
      entries: [
        {
          fields: {
            title: this.title,
            body: this.body
          }
        }
      ]
    });
  });
  it('should throw an error when missing an access token', function() {
    return (function() {
      return compile_fixture.call(this, 'missing_token');
    }).should["throw"]();
  });
  it('should throw an error without content type id', function() {
    return compile_fixture.call(this, 'missing_config').should.be.rejected;
  });
  it('allows the content type name to be set through a k/v object config', function(done) {
    return compile_fixture.call(this, 'alt-content-type-config')["with"](this).then(function() {
      var p;
      p = path.join(this["public"], 'index.html');
      h.file.contains(p, this.title).should.be["true"];
      return h.file.contains(p, this.body).should.be["true"];
    }).then(function() {
      return done();
    })["catch"](done);
  });
  return after(function() {
    return unmock_contentful();
  });
});

describe('contentful content type fields', function() {
  before(function() {
    return mock_contentful({
      entries: [
        {
          fields: {
            sys: 'test'
          }
        }
      ]
    });
  });
  it('should throw an error if `sys` is a field name', function() {
    return compile_fixture.call(this, 'basic').should.be.rejected;
  });
  return after(function() {
    return unmock_contentful();
  });
});

describe('basic compile', function() {
  before(function(done) {
    this.title = 'Throw Some Ds';
    this.body = 'Rich Boy selling crick';
    mock_contentful({
      entries: [
        {
          fields: {
            title: this.title,
            body: this.body
          }
        }
      ]
    });
    return compile_fixture.call(this, 'basic').then(function() {
      return done();
    })["catch"](done);
  });
  it('compiles basic project', function() {
    var p;
    p = path.join(this["public"], 'index.html');
    return h.file.exists(p).should.be.ok;
  });
  it('has contentful data available in views', function() {
    var p;
    p = path.join(this["public"], 'index.html');
    h.file.contains(p, this.title).should.be["true"];
    return h.file.contains(p, this.body).should.be["true"];
  });
  return after(function() {
    return unmock_contentful();
  });
});

describe('write as json', function() {
  before(function(done) {
    this.title = 'Throw Some Ds';
    this.body = 'Rich Boy selling crick';
    mock_contentful({
      entries: [
        {
          fields: {
            title: this.title,
            body: this.body
          }
        }
      ]
    });
    return compile_fixture.call(this, 'write').then(function() {
      return done();
    })["catch"](done);
  });
  it('compiles project', function() {
    var p;
    p = path.join(this["public"], 'index.html');
    return h.file.exists(p).should.be.ok;
  });
  it('has written data as json', function() {
    var p;
    p = path.join(this["public"], 'posts.json');
    h.file.exists(p).should.be.ok;
    h.file.contains(p, this.title).should.be["true"];
    return h.file.contains(p, this.body).should.be["true"];
  });
  return after(function() {
    return unmock_contentful();
  });
});

describe('data manipulation', function() {
  describe('sort', function() {
    before(function(done) {
      var index;
      this.titles = ['Title C', 'Title B', 'Title A'];
      this.bodies = ['Rich Boy selling crick', 'Something else', 'Nothing interesting'];
      this.entries = (function() {
        var j, results;
        results = [];
        for (index = j = 0; j <= 2; index = ++j) {
          results.push({
            fields: {
              title: this.titles[index],
              body: this.bodies[index]
            }
          });
        }
        return results;
      }).call(this);
      mock_contentful({
        entries: this.entries
      });
      return compile_fixture.call(this, 'sort').then(function() {
        return done();
      })["catch"](done);
    });
    it('compiles project', function() {
      var p;
      p = path.join(this["public"], 'index.html');
      return h.file.exists(p).should.be.ok;
    });
    it('orders data correctly for the project', function() {
      var body, j, len, p, ref, results;
      p = path.join(this["public"], 'index.html');
      h.file.contains_match(p, '^.*(Title A)[/<>\\w\\s]*(Title B)[/<>\\w\\s]*(Title C).*$').should.be["true"];
      ref = this.bodies;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        body = ref[j];
        results.push(h.file.contains(p, body).should.be["true"]);
      }
      return results;
    });
    it('has written data as json', function() {
      var p;
      p = path.join(this["public"], 'posts.json');
      h.file.exists(p).should.be.ok;
      return h.file.matches_file(p, 'sort/posts_expected.json').should.be["true"];
    });
    return after(function() {
      return unmock_contentful();
    });
  });
  return describe('transform', function() {
    before(function(done) {
      var index;
      this.titles = ['Title C', 'Title B', 'Title A'];
      this.bodies = ['Rich Boy selling crick', 'Something else', 'Nothing interesting'];
      this.entries = (function() {
        var j, results;
        results = [];
        for (index = j = 0; j <= 2; index = ++j) {
          results.push({
            fields: {
              title: this.titles[index],
              body: this.bodies[index]
            }
          });
        }
        return results;
      }).call(this);
      mock_contentful({
        entries: this.entries
      });
      return compile_fixture.call(this, 'transform').then(function() {
        return done();
      })["catch"](done);
    });
    it('compiles project', function() {
      var p;
      p = path.join(this["public"], 'index.html');
      return h.file.exists(p).should.be.ok;
    });
    it('does not reorder data', function() {
      var p;
      p = path.join(this["public"], 'index.html');
      return h.file.contains_match(p, '^.*(Title C)[/<>\\w\\s]*(Title B)[/<>\\w\\s]*(Title A).*$').should.be["true"];
    });
    it('has manipulated data correctly for the project', function() {
      var body, j, len, p, ref, results;
      p = path.join(this["public"], 'index.html');
      ref = this.bodies;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        body = ref[j];
        results.push(h.file.contains(p, body).should.be["false"]);
      }
      return results;
    });
    it('has written data as json', function() {
      var p;
      p = path.join(this["public"], 'posts.json');
      h.file.exists(p).should.be.ok;
      return h.file.matches_file(p, 'transform/posts_expected.json').should.be["true"];
    });
    return after(function() {
      return unmock_contentful();
    });
  });
});

describe('custom name for view helper local', function() {
  before(function(done) {
    this.title = 'Throw Some Ds';
    this.body = 'Rich Boy selling crack';
    mock_contentful({
      entries: [
        {
          fields: {
            title: this.title,
            body: this.body
          }
        }
      ]
    });
    return compile_fixture.call(this, 'custom_name').then(function() {
      return done();
    })["catch"](done);
  });
  it('has contentful data available in views under a custom name', function() {
    var p;
    p = path.join(this["public"], 'index.html');
    h.file.contains(p, this.title).should.be["true"];
    return h.file.contains(p, this.body).should.be["true"];
  });
  return after(function() {
    return unmock_contentful();
  });
});

describe('single entry views', function() {
  describe('default path function', function() {
    before(function(done) {
      this.title = 'Real Talk';
      this.body = 'I\'m not about to sit up here, and argue about who\'s to blame.';
      mock_contentful({
        entries: [
          {
            fields: {
              title: this.title,
              body: this.body
            }
          }
        ],
        content_type: {
          name: 'Blog Post',
          displayField: 'title'
        }
      });
      return compile_fixture.call(this, 'single_entry').then(function() {
        return done();
      })["catch"](done);
    });
    it('compiles a single entry file based off the slugified display field', function() {
      var p;
      p = path.join(this["public"], "blog_posts/" + (S(this.title).slugify().s) + ".html");
      h.file.exists(p).should.be.ok;
      h.file.contains(p, this.title).should.be["true"];
      return h.file.contains(p, this.body).should.be["true"];
    });
    it('has access to other roots locals inside the single entry view', function() {
      var p;
      p = path.join(this["public"], "blog_posts/" + (S(this.title).slugify().s) + ".html");
      return h.file.contains(p, 'such local').should.be["true"];
    });
    it('sets a _url attribute to allow links to each entry', function() {
      var p;
      p = path.join(this["public"], 'index.html');
      return h.file.contains(p, '/blog_posts/real-talk.html').should.be["true"];
    });
    return after(function() {
      return unmock_contentful();
    });
  });
  describe('should clear entry locals between each single view compile', function() {
    before(function(done) {
      this.title = 'Wow such doge';
      this.body = 'such amaze';
      this.title_2 = 'Totes McGotes';
      this.body_2 = null;
      mock_contentful({
        entries: [
          {
            fields: {
              title: this.title,
              body: this.body
            }
          }, {
            fields: {
              title: this.title_2
            }
          }
        ],
        content_type: {
          name: 'Blog Post',
          displayField: 'title'
        }
      });
      return compile_fixture.call(this, 'single_entry').then(function() {
        return done();
      })["catch"](done);
    });
    after(function() {
      return unmock_contentful();
    });
    return it('should not have first entry\'s content in second entries single view', function() {
      var p;
      p = path.join(this["public"], "blog_posts/" + (S(this.title_2).slugify().s) + ".html");
      return h.file.contains(p, this.body).should.not.be["true"];
    });
  });
  describe('custom path function', function() {
    before(function(done) {
      this.title = 'Real Talk';
      this.body = 'I\'m not about to sit up here, and argue about who\'s to blame.';
      this.category = 'greatest_hits';
      mock_contentful({
        entries: [
          {
            fields: {
              title: this.title,
              body: this.body,
              category: this.category
            }
          }
        ],
        content_type: {
          name: 'Blog Post',
          displayField: 'title'
        }
      });
      return compile_fixture.call(this, 'single_entry_custom').then(function() {
        return done();
      })["catch"](done);
    });
    it('compiles a single entry file using custom path', function() {
      var output, p;
      output = "blogging/" + this.category + "/" + (S(this.title).slugify().s) + ".html";
      p = path.join(this["public"], output);
      h.file.exists(p).should.be.ok;
      h.file.contains(p, this.title).should.be["true"];
      return h.file.contains(p, this.body).should.be["true"];
    });
    return after(function() {
      return unmock_contentful();
    });
  });
  describe('custom multi-path function', function() {
    before(function(done) {
      this.title = ['Real Talk', 'Fake Talk'];
      this.body = ['I\'m not about to sit up here, and argue about who\'s to blame.', 'I\'m about to sit up here, and not argue about who\'s not to blame.'];
      mock_contentful({
        entries: [
          {
            fields: {
              title: this.title[0],
              body: this.body[0]
            }
          }, {
            fields: {
              title: this.title[1],
              body: this.body[1]
            }
          }
        ],
        content_type: {
          name: 'Blog Post',
          displayField: 'title'
        }
      });
      return compile_fixture.call(this, 'single_entry_multi').then(function() {
        return done();
      })["catch"](done);
    });
    it('compiles a single entry to multiple files', function() {
      var i, j, lang, len, output, p, ref, results;
      ref = ['en', 'fr'];
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        lang = ref[j];
        results.push((function() {
          var k, len1, ref1, results1;
          ref1 = [0, 1];
          results1 = [];
          for (k = 0, len1 = ref1.length; k < len1; k++) {
            i = ref1[k];
            output = "/" + lang + "/" + (S(this.title[i]).slugify().s) + ".html";
            p = path.join(this["public"], output);
            h.file.exists(p).should.be.ok;
            h.file.contains(p, this.title[i]).should.be["true"];
            h.file.contains(p, this.body[i]).should.be["true"];
            results1.push(h.file.contains(p, "<p>" + output + "</p>").should.be["true"]);
          }
          return results1;
        }).call(this));
      }
      return results;
    });
    it('sets _urls attribute to all of the entry\'s compiled files', function() {
      var i, j, lang, len, p, ref, results;
      p = path.join(this["public"], 'index.html');
      ref = ['en', 'fr'];
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        lang = ref[j];
        results.push((function() {
          var k, len1, ref1, results1;
          ref1 = [0, 1];
          results1 = [];
          for (k = 0, len1 = ref1.length; k < len1; k++) {
            i = ref1[k];
            results1.push(h.file.contains(p, "/" + lang + "/" + (S(this.title[i]).slugify().s) + ".html").should.be["true"]);
          }
          return results1;
        }).call(this));
      }
      return results;
    });
    return after(function() {
      return unmock_contentful();
    });
  });
  return describe('image view helper function', function() {
    before(function(done) {
      this.img_path = 'http://dogesay.com/wow.jpg';
      mock_contentful({
        entries: [
          {
            fields: {
              image: {
                fields: {
                  file: {
                    url: this.img_path
                  }
                }
              }
            }
          }
        ]
      });
      return compile_fixture.call(this, 'image_view_helper').then(function() {
        return done();
      })["catch"](done);
    });
    it('adds query string params to the image', function() {
      var p;
      p = path.join(this["public"], 'index.html');
      return h.file.contains(p, this.img_path + "?w=100&h=100").should.be["true"];
    });
    return after(function() {
      return unmock_contentful();
    });
  });
});
