Contributing
============

Thanks for your interest in contributing! The advice below will help you get
your issue fixed / pull request merged.

Please file bugs and send pull requests to the
[GitHub repository](https://github.com/mozilla/nunjucks/) and
[issue tracker](https://github.com/mozilla/nunjucks/issues).


Submitting Issues
-----------------

Issues are easier to reproduce/resolve when they have:

- A pull request with a failing test demonstrating the issue
- A code example that produces the issue consistently
- A traceback (when applicable)


Pull Requests
-------------

When creating a pull request:

- Write tests (see below).
- Note user-facing changes in the `CHANGELOG.md` file.
- Update the documentation (in `docs/`) as needed.


Testing
-------

Please add tests for any changes you submit. The tests should fail before your
code changes, and pass with your changes. Existing tests should not break. Test
coverage (output at the end of every test run) should never decrease after your
changes.

To install all the requirements for running the tests:

    npm install

To run the tests:

    npm test
