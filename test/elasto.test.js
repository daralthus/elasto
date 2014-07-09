var assert = require("assert");
var should = require("should");
var _ = require('lodash');
var request  = require('request');
var Bluebird  = require('bluebird');
var chance = require('chance')();
var Elasto = require('../');

Elasto.basePath = 'http://localhost:9200/circle_test';

describe('Elasto', function() {
    var productList = [];

    before(function(done){

        for (var i = 0; i < 20; i++) {
            var slug = chance.word();
            var boutique_slug = chance.word();
            var boutique_slug = chance.word();
            var price = chance.integer({min: 1, max: 2000});

            productList.push({
                slug: slug,
                boutique_slug: boutique_slug,
                price: price
            });
        }

        var createNewProduct = function(newProduct){
            var id = chance.integer({min: 1, max: 2000});
            var productUrl = [Elasto.basePath, 'products', id].join('/'); // 1: index

            return new Bluebird(function (resolve, reject) {
                request({
                    url: productUrl,
                    method: 'PUT',
                    json: newProduct
                }, function (err, res, body) {
                    if (err) return reject(err);
                    resolve(body);
                });
            });
        };

        Bluebird.map(productList, function(product){
            return createNewProduct(product);
        }).then(function(res){
            done();
        });
    });

    it('should set the mapping', function(done){
        var boutiqueMapping = {
            'properties': {
                'slug': { 'type': 'string', 'index': 'not_analyzed' },
                'location' : { 'type' : 'geo_point' }
            }
        };

        Elasto.setMapping('boutiques', boutiqueMapping)
        .then(function(res){
            done();
        });
    });

    describe('find', function() {

        xit('should find a specific item', function(done) {
            var slug = product.boutique_slug;

            Elasto.query('boutiques')
            .where('slug', slug)
            .find().then(function (documents){
                console.log('doc', documents);
                assert.equal(documents.length, 1);
                documents.should.not.be.equal(undefined);
                documents[0].slug.should.be.equal(slug);

                done();
            });

        });

        xit('should find a specific item with multiple params', function(done) {
            var boutique_slug = product.boutique_slug;
            var slug = product.slug;

            Elasto.query('products')
            .where(product)
            .find().then(function (documents){

                documents.length.should.be.equal(1);
                documents.should.not.be.equal(undefined);
                documents[0].slug.should.be.equal(slug);
                documents[0].boutique_slug.should.be.equal(boutique_slug);

                done();
            });
        });

        xit('should request specific fields', function(done) {
            var boutique_slug = product.boutique_slug;
            var slug = product.slug;

            Elasto.query('products')
            .where(product)
            .fields(['slug', 'name'])
            .find().then(function (documents){

                documents.length.should.be.equal(1);
                documents.should.not.be.equal(undefined);
                documents[0].slug.should.be.equal(slug);

                var keys = _.keys(documents[0]);

                keys.length.should.be.equal(2);

                keys.indexOf('name').should.not.be.equal(-1);
                keys.indexOf('slug').should.not.be.equal(-1);

                done();
            });
        });

    });

    describe('search', function() {

        it('should return a specific size of objects', function(done) {
            var size = 6;

            Elasto.query('products')
            .size(size)
            .search().then(function (documents){

                documents.should.not.be.equal(undefined);
                documents.length.should.be.equal(size);
                done();
            });
        });

        it('should return a specific size of objects with where', function(done) {
            var boutique_slug = productList[0].boutique_slug;

            Elasto.query('products')
            .where('boutique_slug', boutique_slug)
            .sort('price')
            .search().then(function (documents){
                documents.should.not.be.equal(undefined);

                var previous = 0;

                documents.map(function(doc){
                    return doc.price;
                }).forEach(function(doc, i){
                    doc.should.not.be.lessThan(previous);
                    previous = doc;
                });

                done();
            })
            .catch(function(err){
                console.log(err);
            });
        });

        it('should return objects in a certain location', function(done) {
            var radius = 1.5;
            Elasto.query('boutiques')
            .near({
                lat: 51.5,
                lon: -0.1467912,
                radius: radius
            })
            .search().then(function (documents){

                documents.should.not.be.equal(undefined);

                documents.forEach(function(doc){
                    doc.sort.length.should.be.equal(1);
                    doc.sort[0].should.be.lessThan(radius);
                });

                done();
            });
        });

        xit('should handle paging', function(done) {
            var oldDocuments = [];

            Elasto.query('boutiques')
            .from(0)
            .size(3)
            .search().then(function (documents){

                documents.should.not.be.equal(undefined);
                documents.length.should.be.equal(3);

                oldDocuments = documents;

                Elasto.query('boutiques')
                .from(1)
                .size(1)
                .search().then(function (docs){

                    oldDocuments.filter(function(b){
                        return docs[0].slug === b.slug;
                    }).length.should.be.equal(1);

                    done();
                });

            });
        });
    });
});