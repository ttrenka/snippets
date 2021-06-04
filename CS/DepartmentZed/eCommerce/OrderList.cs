using System;
using System.Collections;
using System.Data;
using DepartmentZed;

namespace DepartmentZed.eCommerce {
    #region Interface IOrderCollection

    /// <summary>
    /// Defines size, enumerators, and synchronization methods for strongly
    /// typed collections of <see cref="Order"/> elements.
    /// </summary>
    /// <remarks>
    /// <b>IOrderCollection</b> provides an <see cref="ICollection"/>
    /// that is strongly typed for <see cref="Order"/> elements.
    /// </remarks>

    public interface IOrderCollection {
        #region Properties
        #region Count

        /// <summary>
        /// Gets the number of elements contained in the
        /// <see cref="IOrderCollection"/>.
        /// </summary>
        /// <value>The number of elements contained in the
        /// <see cref="IOrderCollection"/>.</value>
        /// <remarks>Please refer to <see cref="ICollection.Count"/> for details.</remarks>

        int Count { get; }

        #endregion
        #region IsSynchronized

        /// <summary>
        /// Gets a value indicating whether access to the
        /// <see cref="IOrderCollection"/> is synchronized (thread-safe).
        /// </summary>
        /// <value><c>true</c> if access to the <see cref="IOrderCollection"/> is
        /// synchronized (thread-safe); otherwise, <c>false</c>. The default is <c>false</c>.</value>
        /// <remarks>Please refer to <see cref="ICollection.IsSynchronized"/> for details.</remarks>

        bool IsSynchronized { get; }

        #endregion
        #region SyncRoot

        /// <summary>
        /// Gets an object that can be used to synchronize access
        /// to the <see cref="IOrderCollection"/>.
        /// </summary>
        /// <value>An object that can be used to synchronize access
        /// to the <see cref="IOrderCollection"/>.</value>
        /// <remarks>Please refer to <see cref="ICollection.SyncRoot"/> for details.</remarks>

        object SyncRoot { get; }

        #endregion
        #endregion
        #region Methods
        #region CopyTo

        /// <summary>
        /// Copies the entire <see cref="IOrderCollection"/> to a one-dimensional <see cref="Array"/>
        /// of <see cref="Order"/> elements, starting at the specified index of the target array.
        /// </summary>
        /// <param name="array">The one-dimensional <see cref="Array"/> that is the destination of the
        /// <see cref="Order"/> elements copied from the <see cref="IOrderCollection"/>.
        /// The <b>Array</b> must have zero-based indexing.</param>
        /// <param name="arrayIndex">The zero-based index in <paramref name="array"/>
        /// at which copying begins.</param>
        /// <exception cref="ArgumentNullException">
        /// <paramref name="array"/> is a null reference.</exception>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <paramref name="arrayIndex"/> is less than zero.</exception>
        /// <exception cref="ArgumentException"><para>
        /// <paramref name="arrayIndex"/> is equal to or greater than the length of <paramref name="array"/>.
        /// </para><para>-or-</para><para>
        /// The number of elements in the source <see cref="IOrderCollection"/> is greater
        /// than the available space from <paramref name="arrayIndex"/> to the end of the destination
        /// <paramref name="array"/>.</para></exception>
        /// <remarks>Please refer to <see cref="ICollection.CopyTo"/> for details.</remarks>

        void CopyTo(Order[] array, int arrayIndex);

        #endregion
        #region GetEnumerator

        /// <summary>
        /// Returns an <see cref="IOrderEnumerator"/> that can
        /// iterate through the <see cref="IOrderCollection"/>.
        /// </summary>
        /// <returns>An <see cref="IOrderEnumerator"/>
        /// for the entire <see cref="IOrderCollection"/>.</returns>
        /// <remarks>Please refer to <see cref="IEnumerable.GetEnumerator"/> for details.</remarks>

        IOrderEnumerator GetEnumerator();

        #endregion
        #endregion
    }

    #endregion
    #region Interface IOrderList

    /// <summary>
    /// Represents a strongly typed collection of <see cref="Order"/>
    /// objects that can be individually accessed by index.
    /// </summary>
    /// <remarks>
    /// <b>IOrderList</b> provides an <see cref="IList"/>
    /// that is strongly typed for <see cref="Order"/> elements.
    /// </remarks>

    public interface
        IOrderList: IOrderCollection {
        #region Properties
        #region IsFixedSize

        /// <summary>
        /// Gets a value indicating whether the <see cref="IOrderList"/> has a fixed size.
        /// </summary>
        /// <value><c>true</c> if the <see cref="IOrderList"/> has a fixed size;
        /// otherwise, <c>false</c>. The default is <c>false</c>.</value>
        /// <remarks>Please refer to <see cref="IList.IsFixedSize"/> for details.</remarks>

        bool IsFixedSize { get; }

        #endregion
        #region IsReadOnly

        /// <summary>
        /// Gets a value indicating whether the <see cref="IOrderList"/> is read-only.
        /// </summary>
        /// <value><c>true</c> if the <see cref="IOrderList"/> is read-only;
        /// otherwise, <c>false</c>. The default is <c>false</c>.</value>
        /// <remarks>Please refer to <see cref="IList.IsReadOnly"/> for details.</remarks>

        bool IsReadOnly { get; }

        #endregion
        #region Item

        /// <summary>
        /// Gets or sets the <see cref="Order"/> element at the specified index.
        /// </summary>
        /// <param name="index">The zero-based index of the
        /// <see cref="Order"/> element to get or set.</param>
        /// <value>
        /// The <see cref="Order"/> element at the specified <paramref name="index"/>.
        /// </value>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <para><paramref name="index"/> is less than zero.</para>
        /// <para>-or-</para>
        /// <para><paramref name="index"/> is equal to or greater than
        /// <see cref="IOrderCollection.Count"/>.</para>
        /// </exception>
        /// <exception cref="NotSupportedException">
        /// The property is set and the <see cref="IOrderList"/> is read-only.</exception>
        /// <remarks>Please refer to <see cref="IList.this"/> for details.</remarks>

        Order this[int index] { get; set; }

        #endregion
        #endregion
        #region Methods
        #region Add

        /// <summary>
        /// Adds a <see cref="Order"/> to the end
        /// of the <see cref="IOrderList"/>.
        /// </summary>
        /// <param name="value">The <see cref="Order"/> object
        /// to be added to the end of the <see cref="IOrderList"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <returns>The <see cref="IOrderList"/> index at which
        /// the <paramref name="value"/> has been added.</returns>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="IOrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>IOrderList</b> has a fixed size.</para></exception>
        /// <remarks>Please refer to <see cref="IList.Add"/> for details.</remarks>

        int Add(Order value);

        #endregion
        #region Clear

        /// <summary>
        /// Removes all elements from the <see cref="IOrderList"/>.
        /// </summary>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="IOrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>IOrderList</b> has a fixed size.</para></exception>
        /// <remarks>Please refer to <see cref="IList.Clear"/> for details.</remarks>

        void Clear();

        #endregion
        #region Contains

        /// <summary>
        /// Determines whether the <see cref="IOrderList"/>
        /// contains the specified <see cref="Order"/> element.
        /// </summary>
        /// <param name="value">The <see cref="Order"/> object
        /// to locate in the <see cref="IOrderList"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <returns><c>true</c> if <paramref name="value"/> is found in the
        /// <see cref="IOrderList"/>; otherwise, <c>false</c>.</returns>
        /// <remarks>Please refer to <see cref="IList.Contains"/> for details.</remarks>

        bool Contains(Order value);

        #endregion
        #region IndexOf

        /// <summary>
        /// Returns the zero-based index of the first occurrence of the specified
        /// <see cref="Order"/> in the <see cref="IOrderList"/>.
        /// </summary>
        /// <param name="value">The <see cref="Order"/> object
        /// to locate in the <see cref="IOrderList"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <returns>
        /// The zero-based index of the first occurrence of <paramref name="value"/>
        /// in the <see cref="IOrderList"/>, if found; otherwise, -1.
        /// </returns>
        /// <remarks>Please refer to <see cref="IList.IndexOf"/> for details.</remarks>

        int IndexOf(Order value);

        #endregion
        #region Insert

        /// <summary>
        /// Inserts a <see cref="Order"/> element into the
        /// <see cref="IOrderList"/> at the specified index.
        /// </summary>
        /// <param name="index">The zero-based index at which
        /// <paramref name="value"/> should be inserted.</param>
        /// <param name="value">The <see cref="Order"/> object
        /// to insert into the <see cref="IOrderList"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <para><paramref name="index"/> is less than zero.</para>
        /// <para>-or-</para>
        /// <para><paramref name="index"/> is greater than
        /// <see cref="IOrderCollection.Count"/>.</para>
        /// </exception>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="IOrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>IOrderList</b> has a fixed size.</para></exception>
        /// <remarks>Please refer to <see cref="IList.Insert"/> for details.</remarks>

        void Insert(int index, Order value);

        #endregion
        #region Remove

        /// <summary>
        /// Removes the first occurrence of the specified <see cref="Order"/>
        /// from the <see cref="IOrderList"/>.
        /// </summary>
        /// <param name="value">The <see cref="Order"/> object
        /// to remove from the <see cref="IOrderList"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="IOrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>IOrderList</b> has a fixed size.</para></exception>
        /// <remarks>Please refer to <see cref="IList.Remove"/> for details.</remarks>

        void Remove(Order value);

        #endregion
        #region RemoveAt

        /// <summary>
        /// Removes the element at the specified index of the
        /// <see cref="IOrderList"/>.
        /// </summary>
        /// <param name="index">The zero-based index of the element to remove.</param>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <para><paramref name="index"/> is less than zero.</para>
        /// <para>-or-</para>
        /// <para><paramref name="index"/> is equal to or greater than
        /// <see cref="IOrderCollection.Count"/>.</para>
        /// </exception>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="IOrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>IOrderList</b> has a fixed size.</para></exception>
        /// <remarks>Please refer to <see cref="IList.RemoveAt"/> for details.</remarks>

        void RemoveAt(int index);

        #endregion
        #endregion
    }

    #endregion
    #region Interface IOrderEnumerator

    /// <summary>
    /// Supports type-safe iteration over a collection that
    /// contains <see cref="Order"/> elements.
    /// </summary>
    /// <remarks>
    /// <b>IOrderEnumerator</b> provides an <see cref="IEnumerator"/>
    /// that is strongly typed for <see cref="Order"/> elements.
    /// </remarks>

    public interface IOrderEnumerator {
        #region Properties
        #region Current

        /// <summary>
        /// Gets the current <see cref="Order"/> element in the collection.
        /// </summary>
        /// <value>The current <see cref="Order"/> element in the collection.</value>
        /// <exception cref="InvalidOperationException"><para>The enumerator is positioned
        /// before the first element of the collection or after the last element.</para>
        /// <para>-or-</para>
        /// <para>The collection was modified after the enumerator was created.</para></exception>
        /// <remarks>Please refer to <see cref="IEnumerator.Current"/> for details, but note
        /// that <b>Current</b> fails if the collection was modified since the last successful
        /// call to <see cref="MoveNext"/> or <see cref="Reset"/>.</remarks>

        Order Current { get; }

        #endregion
        #endregion
        #region Methods
        #region MoveNext

        /// <summary>
        /// Advances the enumerator to the next element of the collection.
        /// </summary>
        /// <returns><c>true</c> if the enumerator was successfully advanced to the next element;
        /// <c>false</c> if the enumerator has passed the end of the collection.</returns>
        /// <exception cref="InvalidOperationException">
        /// The collection was modified after the enumerator was created.</exception>
        /// <remarks>Please refer to <see cref="IEnumerator.MoveNext"/> for details.</remarks>

        bool MoveNext();

        #endregion
        #region Reset

        /// <summary>
        /// Sets the enumerator to its initial position,
        /// which is before the first element in the collection.
        /// </summary>
        /// <exception cref="InvalidOperationException">
        /// The collection was modified after the enumerator was created.</exception>
        /// <remarks>Please refer to <see cref="IEnumerator.Reset"/> for details.</remarks>

        void Reset();

        #endregion
        #endregion
    }

    #endregion
    #region Class OrderList

    /// <summary>
    /// Implements a strongly typed collection of <see cref="Order"/> elements.
    /// </summary>
    /// <remarks><para>
    /// <b>OrderList</b> provides an <see cref="ArrayList"/>
    /// that is strongly typed for <see cref="Order"/> elements.
    /// </para></remarks>

    [Serializable]
    public class OrderList:
        IOrderList, IList, ICloneable {
        #region Private Fields

        private const int _defaultCapacity = 16;

        private Order[] _array = null;
        private int _count = 0;
		private bool isInitialized = false;

        [NonSerialized]
        private int _version = 0;

        #endregion
        #region Private Constructors

        // helper type to identify private ctor
        private enum Tag { Default }

        private OrderList(Tag tag) { }

        #endregion
        #region Public Constructors
        #region OrderList()

        /// <overloads>
        /// Initializes a new instance of the <see cref="OrderList"/> class.
        /// </overloads>
        /// <summary>
        /// Initializes a new instance of the <see cref="OrderList"/> class
        /// that is empty and has the default initial capacity.
        /// </summary>
        /// <remarks>Please refer to <see cref="ArrayList()"/> for details.</remarks>

        public OrderList() {
            this._array = new Order[_defaultCapacity];
        }

        #endregion
        #region OrderList(Int32)

        /// <summary>
        /// Initializes a new instance of the <see cref="OrderList"/> class
        /// that is empty and has the specified initial capacity.
        /// </summary>
        /// <param name="capacity">The number of elements that the new
        /// <see cref="OrderList"/> is initially capable of storing.</param>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <paramref name="capacity"/> is less than zero.</exception>
        /// <remarks>Please refer to <see cref="ArrayList(Int32)"/> for details.</remarks>

        public OrderList(int capacity) {
            if (capacity < 0)
                throw new ArgumentOutOfRangeException("capacity",
                    capacity, "Argument cannot be negative.");

            this._array = new Order[capacity];
        }

        #endregion
        #region OrderList(OrderList)

        /// <summary>
        /// Initializes a new instance of the <see cref="OrderList"/> class
        /// that contains elements copied from the specified collection and
        /// that has the same initial capacity as the number of elements copied.
        /// </summary>
        /// <param name="collection">The <see cref="OrderList"/>
        /// whose elements are copied to the new collection.</param>
        /// <exception cref="ArgumentNullException">
        /// <paramref name="collection"/> is a null reference.</exception>
        /// <remarks>Please refer to <see cref="ArrayList(ICollection)"/> for details.</remarks>

        public OrderList(OrderList collection) {
            if (collection == null)
                throw new ArgumentNullException("collection");

            this._array = new Order[collection.Count];
            AddRange(collection);
        }

        #endregion
        #region OrderList(Order[])

        /// <summary>
        /// Initializes a new instance of the <see cref="OrderList"/> class
        /// that contains elements copied from the specified <see cref="Order"/>
        /// array and that has the same initial capacity as the number of elements copied.
        /// </summary>
        /// <param name="array">An <see cref="Array"/> of <see cref="Order"/>
        /// elements that are copied to the new collection.</param>
        /// <exception cref="ArgumentNullException">
        /// <paramref name="array"/> is a null reference.</exception>
        /// <remarks>Please refer to <see cref="ArrayList(ICollection)"/> for details.</remarks>

        public OrderList(Order[] array) {
            if (array == null)
                throw new ArgumentNullException("array");

            this._array = new Order[array.Length];
            AddRange(array);
        }

        #endregion
        #endregion
        #region Protected Properties
        #region InnerArray
        
        /// <summary>
        /// Gets the list of elements contained in the <see cref="OrderList"/> instance.
        /// </summary>
        /// <value>
        /// A one-dimensional <see cref="Array"/> with zero-based indexing that contains all 
        /// <see cref="Order"/> elements in the <see cref="OrderList"/>.
        /// </value>
        /// <remarks>
        /// Use <b>InnerArray</b> to access the element array of a <see cref="OrderList"/>
        /// instance that might be a read-only or synchronized wrapper. This is necessary because
        /// the element array field of wrapper classes is always a null reference.
        /// </remarks>

        protected virtual Order[] InnerArray {
            get { return this._array; }
        }

        #endregion
        #endregion
        #region Public Properties
        #region Capacity

        /// <summary>
        /// Gets or sets the capacity of the <see cref="OrderList"/>.
        /// </summary>
        /// <value>The number of elements that the
        /// <see cref="OrderList"/> can contain.</value>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <b>Capacity</b> is set to a value that is less than <see cref="Count"/>.</exception>
        /// <remarks>Please refer to <see cref="ArrayList.Capacity"/> for details.</remarks>

        public virtual int Capacity {
            get { return this._array.Length; }
            set {
                if (value == this._array.Length) return;

                if (value < this._count)
                    throw new ArgumentOutOfRangeException("Capacity",
                        value, "Value cannot be less than Count.");

                if (value == 0) {
                    this._array = new Order[_defaultCapacity];
                    return;
                }

                Order[] newArray = new Order[value];
                Array.Copy(this._array, newArray, this._count);
                this._array = newArray;
            }
        }

        #endregion
        #region Count

        /// <summary>
        /// Gets the number of elements contained in the <see cref="OrderList"/>.
        /// </summary>
        /// <value>
        /// The number of elements contained in the <see cref="OrderList"/>.
        /// </value>
        /// <remarks>Please refer to <see cref="ArrayList.Count"/> for details.</remarks>

        public virtual int Count {
            get { return this._count; }
        }

        #endregion
        #region IsFixedSize

        /// <summary>
        /// Gets a value indicating whether the <see cref="OrderList"/> has a fixed size.
        /// </summary>
        /// <value><c>true</c> if the <see cref="OrderList"/> has a fixed size;
        /// otherwise, <c>false</c>. The default is <c>false</c>.</value>
        /// <remarks>Please refer to <see cref="ArrayList.IsFixedSize"/> for details.</remarks>

        public virtual bool IsFixedSize {
            get { return false; }
        }

        #endregion
        #region IsReadOnly

        /// <summary>
        /// Gets a value indicating whether the <see cref="OrderList"/> is read-only.
        /// </summary>
        /// <value><c>true</c> if the <see cref="OrderList"/> is read-only;
        /// otherwise, <c>false</c>. The default is <c>false</c>.</value>
        /// <remarks>Please refer to <see cref="ArrayList.IsReadOnly"/> for details.</remarks>

        public virtual bool IsReadOnly {
            get { return false; }
        }

        #endregion
        #region IsSynchronized

        /// <summary>
        /// Gets a value indicating whether access to the <see cref="OrderList"/>
        /// is synchronized (thread-safe).
        /// </summary>
        /// <value><c>true</c> if access to the <see cref="OrderList"/> is
        /// synchronized (thread-safe); otherwise, <c>false</c>. The default is <c>false</c>.</value>
        /// <remarks>Please refer to <see cref="ArrayList.IsSynchronized"/> for details.</remarks>

        public virtual bool IsSynchronized {
            get { return false; }
        }

        #endregion
		#region IsUnique

		/// <summary>
		/// Gets a value indicating whether the <see cref="OrderList"/> 
		/// ensures that all elements are unique.
		/// </summary>
		/// <value>
		/// <c>true</c> if the <see cref="OrderList"/> ensures that all 
		/// elements are unique; otherwise, <c>false</c>. The default is <c>false</c>.
		/// </value>
		/// <remarks>
		/// <b>IsUnique</b> returns <c>true</c> exactly if the <see cref="OrderList"/>
		/// is exposed through a <see cref="Unique"/> wrapper. 
		/// Please refer to <see cref="Unique"/> for details.
		/// </remarks>

		public virtual bool IsUnique {
			get { return false; }
		}

		#endregion
        #region Item: Order

        /// <summary>
        /// Gets or sets the <see cref="Order"/> element at the specified index.
        /// </summary>
        /// <param name="index">The zero-based index of the
        /// <see cref="Order"/> element to get or set.</param>
        /// <value>
        /// The <see cref="Order"/> element at the specified <paramref name="index"/>.
        /// </value>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <para><paramref name="index"/> is less than zero.</para>
        /// <para>-or-</para>
        /// <para><paramref name="index"/> is equal to or greater than <see cref="Count"/>.</para>
        /// </exception>
        /// <exception cref="NotSupportedException"><para>
        /// The property is set and the <see cref="OrderList"/> is read-only.
        /// </para><para>-or-</para><para>
        /// The property is set, the <b>OrderList</b> already contains the
        /// specified element at a different index, and the <b>OrderList</b>
        /// ensures that all elements are unique.</para></exception>
        /// <remarks>Please refer to <see cref="ArrayList.this"/> for details.</remarks>

        public virtual Order this[int index] {
            get {
                ValidateIndex(index);
                return this._array[index];
            }
            set {
                ValidateIndex(index);
                ++this._version;
                this._array[index] = value;
            }
        }

        #endregion
        #region IList.Item: Object

        /// <summary>
        /// Gets or sets the element at the specified index.
        /// </summary>
        /// <param name="index">The zero-based index of the element to get or set.</param>
        /// <value>
        /// The element at the specified <paramref name="index"/>. When the property
        /// is set, this value must be compatible with <see cref="Order"/>.
        /// </value>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <para><paramref name="index"/> is less than zero.</para>
        /// <para>-or-</para>
        /// <para><paramref name="index"/> is equal to or greater than <see cref="Count"/>.</para>
        /// </exception>
        /// <exception cref="InvalidCastException">The property is set to a value
        /// that is not compatible with <see cref="Order"/>.</exception>
        /// <exception cref="NotSupportedException"><para>
        /// The property is set and the <see cref="OrderList"/> is read-only.
        /// </para><para>-or-</para><para>
        /// The property is set, the <b>OrderList</b> already contains the
        /// specified element at a different index, and the <b>OrderList</b>
        /// ensures that all elements are unique.</para></exception>
        /// <remarks>Please refer to <see cref="ArrayList.this"/> for details.</remarks>

        object IList.this[int index] {
            get { return this[index]; }
            set { this[index] = (Order) value; }
        }

        #endregion
        #region SyncRoot

        /// <summary>
        /// Gets an object that can be used to synchronize
        /// access to the <see cref="OrderList"/>.
        /// </summary>
        /// <value>An object that can be used to synchronize
        /// access to the <see cref="OrderList"/>.
        /// </value>
        /// <remarks>Please refer to <see cref="ArrayList.SyncRoot"/> for details.</remarks>

        public virtual object SyncRoot {
            get { return this; }
        }

        #endregion
        public bool IsInitialized {
			get { return isInitialized; }
		}

        #endregion
        #region Public Methods
        #region Add(Order)

        /// <summary>
        /// Adds a <see cref="Order"/> to the end of the <see cref="OrderList"/>.
        /// </summary>
        /// <param name="value">The <see cref="Order"/> object
        /// to be added to the end of the <see cref="OrderList"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <returns>The <see cref="OrderList"/> index at which the
        /// <paramref name="value"/> has been added.</returns>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="OrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> has a fixed size.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> already contains the specified
        /// <paramref name="value"/>, and the <b>OrderList</b>
        /// ensures that all elements are unique.</para></exception>
        /// <remarks>Please refer to <see cref="ArrayList.Add"/> for details.</remarks>

        public virtual int Add(Order value) {
            if (this._count == this._array.Length)
                EnsureCapacity(this._count + 1);

            ++this._version;
            this._array[this._count] = value;
            return this._count++;
        }

        #endregion
        #region IList.Add(Object)

        /// <summary>
        /// Adds an <see cref="Object"/> to the end of the <see cref="OrderList"/>.
        /// </summary>
        /// <param name="value">
        /// The object to be added to the end of the <see cref="OrderList"/>.
        /// This argument must be compatible with <see cref="Order"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <returns>The <see cref="OrderList"/> index at which the
        /// <paramref name="value"/> has been added.</returns>
        /// <exception cref="InvalidCastException"><paramref name="value"/>
        /// is not compatible with <see cref="Order"/>.</exception>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="OrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> has a fixed size.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> already contains the specified
        /// <paramref name="value"/>, and the <b>OrderList</b>
        /// ensures that all elements are unique.</para></exception>
        /// <remarks>Please refer to <see cref="ArrayList.Add"/> for details.</remarks>

        int IList.Add(object value) {
            return Add((Order) value);
        }

        #endregion
        #region AddRange(OrderList)

        /// <overloads>
        /// Adds a range of elements to the end of the <see cref="OrderList"/>.
        /// </overloads>
        /// <summary>
        /// Adds the elements of another collection to the end of the <see cref="OrderList"/>.
        /// </summary>
        /// <param name="collection">The <see cref="OrderList"/> whose elements
        /// should be added to the end of the current collection.</param>
        /// <exception cref="ArgumentNullException">
        /// <paramref name="collection"/> is a null reference.</exception>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="OrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> has a fixed size.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> already contains one or more elements
        /// in the specified <paramref name="collection"/>, and the <b>OrderList</b>
        /// ensures that all elements are unique.</para></exception>
        /// <remarks>Please refer to <see cref="ArrayList.AddRange"/> for details.</remarks>

        public virtual void AddRange(OrderList collection) {
            if (collection == null)
                throw new ArgumentNullException("collection");

            if (collection.Count == 0) return;
            if (this._count + collection.Count > this._array.Length)
                EnsureCapacity(this._count + collection.Count);

            ++this._version;
            Array.Copy(collection.InnerArray, 0,
                this._array, this._count, collection.Count);
            this._count += collection.Count;
        }

        #endregion
        #region AddRange(Order[])

        /// <summary>
        /// Adds the elements of a <see cref="Order"/> array
        /// to the end of the <see cref="OrderList"/>.
        /// </summary>
        /// <param name="array">An <see cref="Array"/> of <see cref="Order"/> elements
        /// that should be added to the end of the <see cref="OrderList"/>.</param>
        /// <exception cref="ArgumentNullException">
        /// <paramref name="array"/> is a null reference.</exception>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="OrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> has a fixed size.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> already contains one or more elements
        /// in the specified <paramref name="array"/>, and the <b>OrderList</b>
        /// ensures that all elements are unique.</para></exception>
        /// <remarks>Please refer to <see cref="ArrayList.AddRange"/> for details.</remarks>

        public virtual void AddRange(Order[] array) {
            if (array == null)
                throw new ArgumentNullException("array");

            if (array.Length == 0) return;
            if (this._count + array.Length > this._array.Length)
                EnsureCapacity(this._count + array.Length);

            ++this._version;
            Array.Copy(array, 0, this._array, this._count, array.Length);
            this._count += array.Length;
        }

        #endregion
        #region BinarySearch

        /// <summary>
        /// Searches the entire sorted <see cref="OrderList"/> for an
        /// <see cref="Order"/> element using the default comparer
        /// and returns the zero-based index of the element.
        /// </summary>
        /// <param name="value">The <see cref="Order"/> object
        /// to locate in the <see cref="OrderList"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <returns>The zero-based index of <paramref name="value"/> in the sorted
        /// <see cref="OrderList"/>, if <paramref name="value"/> is found;
        /// otherwise, a negative number, which is the bitwise complement of the index
        /// of the next element that is larger than <paramref name="value"/> or, if there
        /// is no larger element, the bitwise complement of <see cref="Count"/>.</returns>
        /// <exception cref="InvalidOperationException">
        /// Neither <paramref name="value"/> nor the elements of the <see cref="OrderList"/>
        /// implement the <see cref="IComparable"/> interface.</exception>
        /// <remarks>Please refer to <see cref="ArrayList.BinarySearch"/> for details.</remarks>

        public virtual int BinarySearch(Order value) {
            return Array.BinarySearch(this._array, 0, this._count, value);
        }

        #endregion
        #region Clear

        /// <summary>
        /// Removes all elements from the <see cref="OrderList"/>.
        /// </summary>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="OrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> has a fixed size.</para></exception>
        /// <remarks>Please refer to <see cref="ArrayList.Clear"/> for details.</remarks>

        public virtual void Clear() {
            if (this._count == 0) return;

            ++this._version;
            Array.Clear(this._array, 0, this._count);
            this._count = 0;
        }

        #endregion
        #region Clone

        /// <summary>
        /// Creates a shallow copy of the <see cref="OrderList"/>.
        /// </summary>
        /// <returns>A shallow copy of the <see cref="OrderList"/>.</returns>
        /// <remarks>Please refer to <see cref="ArrayList.Clone"/> for details.</remarks>

        public virtual object Clone() {
            OrderList collection = new OrderList(this._count);

            Array.Copy(this._array, 0, collection._array, 0, this._count);
            collection._count = this._count;
            collection._version = this._version;

            return collection;
        }

        #endregion
        #region Contains(Order)

        /// <summary>
        /// Determines whether the <see cref="OrderList"/>
        /// contains the specified <see cref="Order"/> element.
        /// </summary>
        /// <param name="value">The <see cref="Order"/> object
        /// to locate in the <see cref="OrderList"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <returns><c>true</c> if <paramref name="value"/> is found in the
        /// <see cref="OrderList"/>; otherwise, <c>false</c>.</returns>
        /// <remarks>Please refer to <see cref="ArrayList.Contains"/> for details.</remarks>

        public bool Contains(Order value) {
            return (IndexOf(value) >= 0);
        }

        #endregion
        #region IList.Contains(Object)

        /// <summary>
        /// Determines whether the <see cref="OrderList"/> contains the specified element.
        /// </summary>
        /// <param name="value">The object to locate in the <see cref="OrderList"/>.
        /// This argument must be compatible with <see cref="Order"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <returns><c>true</c> if <paramref name="value"/> is found in the
        /// <see cref="OrderList"/>; otherwise, <c>false</c>.</returns>
        /// <exception cref="InvalidCastException"><paramref name="value"/>
        /// is not compatible with <see cref="Order"/>.</exception>
        /// <remarks>Please refer to <see cref="ArrayList.Contains"/> for details.</remarks>

        bool IList.Contains(object value) {
            return Contains((Order) value);
        }

        #endregion
        #region CopyTo(Order[])

        /// <overloads>
        /// Copies the <see cref="OrderList"/> or a portion of it to a one-dimensional array.
        /// </overloads>
        /// <summary>
        /// Copies the entire <see cref="OrderList"/> to a one-dimensional <see cref="Array"/>
        /// of <see cref="Order"/> elements, starting at the beginning of the target array.
        /// </summary>
        /// <param name="array">The one-dimensional <see cref="Array"/> that is the destination of the
        /// <see cref="Order"/> elements copied from the <see cref="OrderList"/>.
        /// The <b>Array</b> must have zero-based indexing.</param>
        /// <exception cref="ArgumentNullException">
        /// <paramref name="array"/> is a null reference.</exception>
        /// <exception cref="ArgumentException">
        /// The number of elements in the source <see cref="OrderList"/> is greater
        /// than the available space in the destination <paramref name="array"/>.</exception>
        /// <remarks>Please refer to <see cref="ArrayList.CopyTo"/> for details.</remarks>

        public virtual void CopyTo(Order[] array) {
            CheckTargetArray(array, 0);
            Array.Copy(this._array, array, this._count);
        }

        #endregion
        #region CopyTo(Order[], Int32)

        /// <summary>
        /// Copies the entire <see cref="OrderList"/> to a one-dimensional <see cref="Array"/>
        /// of <see cref="Order"/> elements, starting at the specified index of the target array.
        /// </summary>
        /// <param name="array">The one-dimensional <see cref="Array"/> that is the destination of the
        /// <see cref="Order"/> elements copied from the <see cref="OrderList"/>.
        /// The <b>Array</b> must have zero-based indexing.</param>
        /// <param name="arrayIndex">The zero-based index in <paramref name="array"/>
        /// at which copying begins.</param>
        /// <exception cref="ArgumentNullException">
        /// <paramref name="array"/> is a null reference.</exception>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <paramref name="arrayIndex"/> is less than zero.</exception>
        /// <exception cref="ArgumentException"><para>
        /// <paramref name="arrayIndex"/> is equal to or greater than the length of <paramref name="array"/>.
        /// </para><para>-or-</para><para>
        /// The number of elements in the source <see cref="OrderList"/> is greater than the
        /// available space from <paramref name="arrayIndex"/> to the end of the destination
        /// <paramref name="array"/>.</para></exception>
        /// <remarks>Please refer to <see cref="ArrayList.CopyTo"/> for details.</remarks>

        public virtual void CopyTo(Order[] array, int arrayIndex) {
            CheckTargetArray(array, arrayIndex);
            Array.Copy(this._array, 0, array, arrayIndex, this._count);
        }

        #endregion
        #region ICollection.CopyTo(Array, Int32)

        /// <summary>
        /// Copies the entire <see cref="OrderList"/> to a one-dimensional <see cref="Array"/>,
        /// starting at the specified index of the target array.
        /// </summary>
        /// <param name="array">The one-dimensional <see cref="Array"/> that is the destination of the
        /// <see cref="Order"/> elements copied from the <see cref="OrderList"/>.
        /// The <b>Array</b> must have zero-based indexing.</param>
        /// <param name="arrayIndex">The zero-based index in <paramref name="array"/>
        /// at which copying begins.</param>
        /// <exception cref="ArgumentNullException">
        /// <paramref name="array"/> is a null reference.</exception>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <paramref name="arrayIndex"/> is less than zero.</exception>
        /// <exception cref="ArgumentException"><para>
        /// <paramref name="array"/> is multidimensional.
        /// </para><para>-or-</para><para>
        /// <paramref name="arrayIndex"/> is equal to or greater than the length of <paramref name="array"/>.
        /// </para><para>-or-</para><para>
        /// The number of elements in the source <see cref="OrderList"/> is greater than the
        /// available space from <paramref name="arrayIndex"/> to the end of the destination
        /// <paramref name="array"/>.</para></exception>
        /// <exception cref="InvalidCastException">
        /// The <see cref="Order"/> type cannot be cast automatically
        /// to the type of the destination <paramref name="array"/>.</exception>
        /// <remarks>Please refer to <see cref="ArrayList.CopyTo"/> for details.</remarks>

        void ICollection.CopyTo(Array array, int arrayIndex) {
            CheckTargetArray(array, arrayIndex);
            CopyTo((Order[]) array, arrayIndex);
        }

        #endregion
        #region GetEnumerator: IOrderEnumerator

        /// <summary>
        /// Returns an <see cref="IOrderEnumerator"/> that can
        /// iterate through the <see cref="OrderList"/>.
        /// </summary>
        /// <returns>An <see cref="IOrderEnumerator"/>
        /// for the entire <see cref="OrderList"/>.</returns>
        /// <remarks>Please refer to <see cref="ArrayList.GetEnumerator"/> for details.</remarks>

        public virtual IOrderEnumerator GetEnumerator() {
            return new Enumerator(this);
        }

        #endregion
        #region IEnumerable.GetEnumerator: IEnumerator

        /// <summary>
        /// Returns an <see cref="IEnumerator"/> that can
        /// iterate through the <see cref="OrderList"/>.
        /// </summary>
        /// <returns>An <see cref="IEnumerator"/>
        /// for the entire <see cref="OrderList"/>.</returns>
        /// <remarks>Please refer to <see cref="ArrayList.GetEnumerator"/> for details.</remarks>

        IEnumerator IEnumerable.GetEnumerator() {
            return (IEnumerator) GetEnumerator();
        }

        #endregion
        #region IndexOf(Order)

        /// <summary>
        /// Returns the zero-based index of the first occurrence of the specified
        /// <see cref="Order"/> in the <see cref="OrderList"/>.
        /// </summary>
        /// <param name="value">The <see cref="Order"/> object
        /// to locate in the <see cref="OrderList"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <returns>
        /// The zero-based index of the first occurrence of <paramref name="value"/>
        /// in the <see cref="OrderList"/>, if found; otherwise, -1.
        /// </returns>
        /// <remarks>Please refer to <see cref="ArrayList.IndexOf"/> for details.</remarks>

        public virtual int IndexOf(Order value) {
            return Array.IndexOf(this._array, value, 0, this._count);
        }

        #endregion
        #region IList.IndexOf(Object)

        /// <summary>
        /// Returns the zero-based index of the first occurrence of the specified
        /// <see cref="Object"/> in the <see cref="OrderList"/>.
        /// </summary>
        /// <param name="value">The object to locate in the <see cref="OrderList"/>.
        /// This argument must be compatible with <see cref="Order"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <returns>
        /// The zero-based index of the first occurrence of <paramref name="value"/>
        /// in the <see cref="OrderList"/>, if found; otherwise, -1.
        /// </returns>
        /// <exception cref="InvalidCastException"><paramref name="value"/>
        /// is not compatible with <see cref="Order"/>.</exception>
        /// <remarks>Please refer to <see cref="ArrayList.IndexOf"/> for details.</remarks>

        int IList.IndexOf(object value) {
            return IndexOf((Order) value);
        }

        #endregion
        #region Insert(Int32, Order)

        /// <summary>
        /// Inserts a <see cref="Order"/> element into the
        /// <see cref="OrderList"/> at the specified index.
        /// </summary>
        /// <param name="index">The zero-based index at which <paramref name="value"/>
        /// should be inserted.</param>
        /// <param name="value">The <see cref="Order"/> object
        /// to insert into the <see cref="OrderList"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <para><paramref name="index"/> is less than zero.</para>
        /// <para>-or-</para>
        /// <para><paramref name="index"/> is greater than <see cref="Count"/>.</para>
        /// </exception>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="OrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> has a fixed size.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> already contains the specified
        /// <paramref name="value"/>, and the <b>OrderList</b>
        /// ensures that all elements are unique.</para></exception>
        /// <remarks>Please refer to <see cref="ArrayList.Insert"/> for details.</remarks>

        public virtual void Insert(int index, Order value) {
            if (index < 0)
                throw new ArgumentOutOfRangeException("index",
                    index, "Argument cannot be negative.");

            if (index > this._count)
                throw new ArgumentOutOfRangeException("index",
                    index, "Argument cannot exceed Count.");

            if (this._count == this._array.Length)
                EnsureCapacity(this._count + 1);

            ++this._version;
            if (index < this._count)
                Array.Copy(this._array, index,
                    this._array, index + 1, this._count - index);

            this._array[index] = value;
            ++this._count;
        }

        #endregion
        #region IList.Insert(Int32, Object)

        /// <summary>
        /// Inserts an element into the <see cref="OrderList"/> at the specified index.
        /// </summary>
        /// <param name="index">The zero-based index at which <paramref name="value"/>
        /// should be inserted.</param>
        /// <param name="value">The object to insert into the <see cref="OrderList"/>.
        /// This argument must be compatible with <see cref="Order"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <para><paramref name="index"/> is less than zero.</para>
        /// <para>-or-</para>
        /// <para><paramref name="index"/> is greater than <see cref="Count"/>.</para>
        /// </exception>
        /// <exception cref="InvalidCastException"><paramref name="value"/>
        /// is not compatible with <see cref="Order"/>.</exception>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="OrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> has a fixed size.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> already contains the specified
        /// <paramref name="value"/>, and the <b>OrderList</b>
        /// ensures that all elements are unique.</para></exception>
        /// <remarks>Please refer to <see cref="ArrayList.Insert"/> for details.</remarks>

        void IList.Insert(int index, object value) {
            Insert(index, (Order) value);
        }

        #endregion
        #region ReadOnly

        /// <summary>
        /// Returns a read-only wrapper for the specified <see cref="OrderList"/>.
        /// </summary>
        /// <param name="collection">The <see cref="OrderList"/> to wrap.</param>
        /// <returns>A read-only wrapper around <paramref name="collection"/>.</returns>
        /// <exception cref="ArgumentNullException">
        /// <paramref name="collection"/> is a null reference.</exception>
        /// <remarks>Please refer to <see cref="ArrayList.ReadOnly"/> for details.</remarks>

        public static OrderList ReadOnly(OrderList collection) {
            if (collection == null)
                throw new ArgumentNullException("collection");

            return new ReadOnlyList(collection);
        }

        #endregion
        #region Remove(Order)

        /// <summary>
        /// Removes the first occurrence of the specified <see cref="Order"/>
        /// from the <see cref="OrderList"/>.
        /// </summary>
        /// <param name="value">The <see cref="Order"/> object
        /// to remove from the <see cref="OrderList"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="OrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> has a fixed size.</para></exception>
        /// <remarks>Please refer to <see cref="ArrayList.Remove"/> for details.</remarks>

        public virtual void Remove(Order value) {
            int index = IndexOf(value);
            if (index >= 0) RemoveAt(index);
        }

        #endregion
        #region IList.Remove(Object)

        /// <summary>
        /// Removes the first occurrence of the specified <see cref="Object"/>
        /// from the <see cref="OrderList"/>.
        /// </summary>
        /// <param name="value">The object to remove from the <see cref="OrderList"/>.
        /// This argument must be compatible with <see cref="Order"/>.
        /// This argument can be a null reference.
        /// </param>
        /// <exception cref="InvalidCastException"><paramref name="value"/>
        /// is not compatible with <see cref="Order"/>.</exception>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="OrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> has a fixed size.</para></exception>
        /// <remarks>Please refer to <see cref="ArrayList.Remove"/> for details.</remarks>

        void IList.Remove(object value) {
            Remove((Order) value);
        }

        #endregion
        #region RemoveAt

        /// <summary>
        /// Removes the element at the specified index of the <see cref="OrderList"/>.
        /// </summary>
        /// <param name="index">The zero-based index of the element to remove.</param>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <para><paramref name="index"/> is less than zero.</para>
        /// <para>-or-</para>
        /// <para><paramref name="index"/> is equal to or greater than <see cref="Count"/>.</para>
        /// </exception>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="OrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> has a fixed size.</para></exception>
        /// <remarks>Please refer to <see cref="ArrayList.RemoveAt"/> for details.</remarks>

        public virtual void RemoveAt(int index) {
            ValidateIndex(index);

            ++this._version;
            if (index < --this._count)
                Array.Copy(this._array, index + 1,
                    this._array, index, this._count - index);

            this._array[this._count] = null;
        }

        #endregion
        #region RemoveRange

        /// <summary>
        /// Removes the specified range of elements from the <see cref="OrderList"/>.
        /// </summary>
        /// <param name="index">The zero-based starting index of the range
        /// of elements to remove.</param>
        /// <param name="count">The number of elements to remove.</param>
        /// <exception cref="ArgumentException">
        /// <paramref name="index"/> and <paramref name="count"/> do not denote a
        /// valid range of elements in the <see cref="OrderList"/>.</exception>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <para><paramref name="index"/> is less than zero.</para>
        /// <para>-or-</para>
        /// <para><paramref name="count"/> is less than zero.</para>
        /// </exception>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="OrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> has a fixed size.</para></exception>
        /// <remarks>Please refer to <see cref="ArrayList.RemoveRange"/> for details.</remarks>

        public virtual void RemoveRange(int index, int count) {
            if (index < 0)
                throw new ArgumentOutOfRangeException("index",
                    index, "Argument cannot be negative.");

            if (count < 0)
                throw new ArgumentOutOfRangeException("count",
                    count, "Argument cannot be negative.");

            if (index + count > this._count)
                throw new ArgumentException(
                    "Arguments denote invalid range of elements.");

            if (count == 0) return;

            ++this._version;
            this._count -= count;

            if (index < this._count)
                Array.Copy(this._array, index + count,
                    this._array, index, this._count - index);

            Array.Clear(this._array, this._count, count);
        }

        #endregion
        #region Reverse()

        /// <overloads>
        /// Reverses the order of the elements in the 
        /// <see cref="OrderList"/> or a portion of it.
        /// </overloads>
        /// <summary>
        /// Reverses the order of the elements in the entire <see cref="OrderList"/>.
        /// </summary>
        /// <exception cref="NotSupportedException">
        /// The <see cref="OrderList"/> is read-only.</exception>
        /// <remarks>Please refer to <see cref="ArrayList.Reverse"/> for details.</remarks>

        public virtual void Reverse() {
           if (this._count <= 1) return;
           ++this._version;
           Array.Reverse(this._array, 0, this._count);
        }

        #endregion
        #region Reverse(Int32, Int32)

        /// <summary>
        /// Reverses the order of the elements in the specified range.
        /// </summary>
        /// <param name="index">The zero-based starting index of the range
        /// of elements to reverse.</param>
        /// <param name="count">The number of elements to reverse.</param>
        /// <exception cref="ArgumentException">
        /// <paramref name="index"/> and <paramref name="count"/> do not denote a
        /// valid range of elements in the <see cref="OrderList"/>.</exception>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <para><paramref name="index"/> is less than zero.</para>
        /// <para>-or-</para>
        /// <para><paramref name="count"/> is less than zero.</para>
        /// </exception>
        /// <exception cref="NotSupportedException">
        /// The <see cref="OrderList"/> is read-only.</exception>
        /// <remarks>Please refer to <see cref="ArrayList.Reverse"/> for details.</remarks>

        public virtual void Reverse(int index, int count) {
            if (index < 0)
                throw new ArgumentOutOfRangeException("index",
                    index, "Argument cannot be negative.");

            if (count < 0)
                throw new ArgumentOutOfRangeException("count",
                    count, "Argument cannot be negative.");

            if (index + count > this._count)
                throw new ArgumentException(
                    "Arguments denote invalid range of elements.");

           if (count <= 1 || this._count <= 1) return;
           ++this._version;
           Array.Reverse(this._array, index, count);
        }

        #endregion
        #region Sort()

        /// <overloads>
        /// Sorts the elements in the <see cref="OrderList"/> or a portion of it.
        /// </overloads>
        /// <summary>
        /// Sorts the elements in the entire <see cref="OrderList"/>
        /// using the <see cref="IComparable"/> implementation of each element.
        /// </summary>
        /// <exception cref="NotSupportedException">
        /// The <see cref="OrderList"/> is read-only.</exception>
        /// <remarks>Please refer to <see cref="ArrayList.Sort"/> for details.</remarks>

        public virtual void Sort() {
            if (this._count <= 1) return;
            ++this._version;
            Array.Sort(this._array, 0, this._count);
        }

        #endregion
        #region Sort(IComparer)

        /// <summary>
        /// Sorts the elements in the entire <see cref="OrderList"/>
        /// using the specified <see cref="IComparer"/> interface.
        /// </summary>
        /// <param name="comparer">
        /// <para>The <see cref="IComparer"/> implementation to use when comparing elements.</para>
        /// <para>-or-</para>
        /// <para>A null reference to use the <see cref="IComparable"/> implementation 
        /// of each element.</para></param>
        /// <exception cref="NotSupportedException">
        /// The <see cref="OrderList"/> is read-only.</exception>
        /// <remarks>Please refer to <see cref="ArrayList.Sort"/> for details.</remarks>

        public virtual void Sort(IComparer comparer) {
            if (this._count <= 1) return;
            ++this._version;
            Array.Sort(this._array, 0, this._count, comparer);
        }

        #endregion
        #region Sort(Int32, Int32, IComparer)

        /// <summary>
        /// Sorts the elements in the specified range 
        /// using the specified <see cref="IComparer"/> interface.
        /// </summary>
        /// <param name="index">The zero-based starting index of the range
        /// of elements to sort.</param>
        /// <param name="count">The number of elements to sort.</param>
        /// <param name="comparer">
        /// <para>The <see cref="IComparer"/> implementation to use when comparing elements.</para>
        /// <para>-or-</para>
        /// <para>A null reference to use the <see cref="IComparable"/> implementation 
        /// of each element.</para></param>
        /// <exception cref="ArgumentException">
        /// <paramref name="index"/> and <paramref name="count"/> do not denote a
        /// valid range of elements in the <see cref="OrderList"/>.</exception>
        /// <exception cref="ArgumentOutOfRangeException">
        /// <para><paramref name="index"/> is less than zero.</para>
        /// <para>-or-</para>
        /// <para><paramref name="count"/> is less than zero.</para>
        /// </exception>
        /// <exception cref="NotSupportedException">
        /// The <see cref="OrderList"/> is read-only.</exception>
        /// <remarks>Please refer to <see cref="ArrayList.Sort"/> for details.</remarks>

        public virtual void Sort(int index, int count, IComparer comparer) {
            if (index < 0)
                throw new ArgumentOutOfRangeException("index",
                    index, "Argument cannot be negative.");

            if (count < 0)
                throw new ArgumentOutOfRangeException("count",
                    count, "Argument cannot be negative.");

            if (index + count > this._count)
                throw new ArgumentException(
                    "Arguments denote invalid range of elements.");

           if (count <= 1 || this._count <= 1) return;
            ++this._version;
            Array.Sort(this._array, index, count, comparer);
        }

        #endregion
        #region Synchronized

        /// <summary>
        /// Returns a synchronized (thread-safe) wrapper
        /// for the specified <see cref="OrderList"/>.
        /// </summary>
        /// <param name="collection">The <see cref="OrderList"/> to synchronize.</param>
        /// <returns>
        /// A synchronized (thread-safe) wrapper around <paramref name="collection"/>.
        /// </returns>
        /// <exception cref="ArgumentNullException">
        /// <paramref name="collection"/> is a null reference.</exception>
        /// <remarks>Please refer to <see cref="ArrayList.Synchronized"/> for details.</remarks>

        public static OrderList Synchronized(OrderList collection) {
            if (collection == null)
                throw new ArgumentNullException("collection");

            return new SyncList(collection);
        }

        #endregion
        #region ToArray

        /// <summary>
        /// Copies the elements of the <see cref="OrderList"/> to a new
        /// <see cref="Array"/> of <see cref="Order"/> elements.
        /// </summary>
        /// <returns>A one-dimensional <see cref="Array"/> of <see cref="Order"/>
        /// elements containing copies of the elements of the <see cref="OrderList"/>.</returns>
        /// <remarks>Please refer to <see cref="ArrayList.ToArray"/> for details.</remarks>

        public virtual Order[] ToArray() {
            Order[] array = new Order[this._count];
            Array.Copy(this._array, array, this._count);
            return array;
        }

        #endregion
        #region TrimToSize

        /// <summary>
        /// Sets the capacity to the actual number of elements in the <see cref="OrderList"/>.
        /// </summary>
        /// <exception cref="NotSupportedException">
        /// <para>The <see cref="OrderList"/> is read-only.</para>
        /// <para>-or-</para>
        /// <para>The <b>OrderList</b> has a fixed size.</para></exception>
        /// <remarks>Please refer to <see cref="ArrayList.TrimToSize"/> for details.</remarks>

        public virtual void TrimToSize() {
            Capacity = this._count;
        }

        #endregion
        #region Unique

        /// <summary>
        /// Returns a wrapper for the specified <see cref="OrderList"/>
        /// ensuring that all elements are unique.
        /// </summary>
        /// <param name="collection">The <see cref="OrderList"/> to wrap.</param>    
        /// <returns>
        /// A wrapper around <paramref name="collection"/> ensuring that all elements are unique.
        /// </returns>
        /// <exception cref="ArgumentException">
        /// <paramref name="collection"/> contains duplicate elements.</exception>
        /// <exception cref="ArgumentNullException">
        /// <paramref name="collection"/> is a null reference.</exception>
        /// <remarks><para>
        /// The <b>Unique</b> wrapper provides a set-like collection by ensuring
        /// that all elements in the <see cref="OrderList"/> are unique.
        /// </para><para>
        /// <b>Unique</b> raises an <see cref="ArgumentException"/> if the specified 
        /// <paramref name="collection"/> contains any duplicate elements. The returned
        /// wrapper raises a <see cref="NotSupportedException"/> whenever the user attempts 
        /// to add an element that is already contained in the <b>OrderList</b>.
        /// </para><para>
        /// <strong>Note:</strong> The <b>Unique</b> wrapper reflects any changes made
        /// to the underlying <paramref name="collection"/>, including the possible
        /// creation of duplicate elements. The uniqueness of all elements is therefore
        /// no longer assured if the underlying collection is manipulated directly.
        /// </para></remarks>

        public static OrderList Unique(OrderList collection) {
            if (collection == null)
                throw new ArgumentNullException("collection");

            for (int i = collection.Count - 1; i > 0; i--)
                if (collection.IndexOf(collection[i]) < i)
                    throw new ArgumentException("collection",
                        "Argument cannot contain duplicate elements.");

            return new UniqueList(collection);
        }

        #endregion
        #endregion
        #region Added Methods
        //	when used in the context of a user.
        public void Initialize(Guid usrMaster, string cn){
			this.Clear();
			string sql = "SELECT * FROM usrOrder WHERE usrMaster = '" + usrMaster.ToString() + "' ORDER BY OrderDate";
			DataRowCollection rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
			if (rows.Count > 0){
				for (int i = 0; i < rows.Count; i++) {
					this.Add(new Order(rows[i], cn));
				}
			}
			isInitialized = true;
        }
        //	probably for reports and what not.
        public void Initialize(string filter, string cn) {
			this.Clear();
			string sql = "SELECT * FROM usrOrder " + filter + " ORDER BY Id";
			DataRowCollection rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
			if (rows.Count > 0){
				for (int i = 0; i < rows.Count; i++) {
					this.Add(new Order(rows[i], cn));
				}
			}
			isInitialized = true;
        }
        public void Save() {
			for (int i = 0; i < this.Count; i++) this[i].Save();
        }
        #endregion

        #region Private Methods
        #region CheckEnumIndex

        private void CheckEnumIndex(int index) {
            if (index < 0 || index >= this._count)
                throw new InvalidOperationException(
                    "Enumerator is not on a collection element.");
        }

        #endregion
        #region CheckEnumVersion

        private void CheckEnumVersion(int version) {
            if (version != this._version)
                throw new InvalidOperationException(
                    "Enumerator invalidated by modification to collection.");
        }

        #endregion
        #region CheckTargetArray

        private void CheckTargetArray(Array array, int arrayIndex) {
            if (array == null)
                throw new ArgumentNullException("array");
            if (array.Rank > 1)
                throw new ArgumentException(
                    "Argument cannot be multidimensional.", "array");

            if (arrayIndex < 0)
                throw new ArgumentOutOfRangeException("arrayIndex",
                    arrayIndex, "Argument cannot be negative.");
            if (arrayIndex >= array.Length)
                throw new ArgumentException(
                    "Argument must be less than array length.", "arrayIndex");

            if (this._count > array.Length - arrayIndex)
                throw new ArgumentException(
                    "Argument section must be large enough for collection.", "array");
        }

        #endregion
        #region EnsureCapacity

        private void EnsureCapacity(int minimum) {
            int newCapacity = (this._array.Length == 0 ?
                _defaultCapacity : this._array.Length * 2);

            if (newCapacity < minimum) newCapacity = minimum;
            Capacity = newCapacity;
        }

        #endregion
        #region ValidateIndex

        private void ValidateIndex(int index) {
            if (index < 0)
                throw new ArgumentOutOfRangeException("index",
                    index, "Argument cannot be negative.");

            if (index >= this._count)
                throw new ArgumentOutOfRangeException("index",
                    index, "Argument must be less than Count.");
        }

        #endregion
        #endregion
        #region Class Enumerator

        [Serializable]
        private sealed class Enumerator:
            IOrderEnumerator, IEnumerator {
            #region Private Fields

            private readonly OrderList _collection;
            private readonly int _version;
            private int _index;

            #endregion
            #region Internal Constructors

            internal Enumerator(OrderList collection) {
                this._collection = collection;
                this._version = collection._version;
                this._index = -1;
            }

            #endregion
            #region Public Properties

            public Order Current {
                get {
                    this._collection.CheckEnumIndex(this._index);
                    this._collection.CheckEnumVersion(this._version);
                    return this._collection[this._index];
                }
            }

            object IEnumerator.Current {
                get { return Current; }
            }

            #endregion
            #region Public Methods

            public bool MoveNext() {
                this._collection.CheckEnumVersion(this._version);
                return (++this._index < this._collection.Count);
            }

            public void Reset() {
                this._collection.CheckEnumVersion(this._version);
                this._index = -1;
            }

            #endregion
        }

        #endregion
        #region Class ReadOnlyList

        [Serializable]
        private sealed class ReadOnlyList: OrderList {
            #region Private Fields

            private OrderList _collection;

            #endregion
            #region Internal Constructors

            internal ReadOnlyList(OrderList collection):
                base(Tag.Default) {
                this._collection = collection;
            }

            #endregion
            #region Protected Properties

            protected override Order[] InnerArray {
                get { return this._collection.InnerArray; }
            }

            #endregion
            #region Public Properties

            public override int Capacity {
                get { return this._collection.Capacity; }
                set { throw new NotSupportedException(
                        "Read-only collections cannot be modified."); }
            }

            public override int Count {
                get { return this._collection.Count; }
            }

            public override bool IsFixedSize {
                get { return true; }
            }

            public override bool IsReadOnly {
                get { return true; }
            }

            public override bool IsSynchronized {
                get { return this._collection.IsSynchronized; }
            }

            public override bool IsUnique {
                get { return this._collection.IsUnique; }
            }

            public override Order this[int index] {
                get { return this._collection[index]; }
                set { throw new NotSupportedException(
                        "Read-only collections cannot be modified."); }
            }

            public override object SyncRoot {
                get { return this._collection.SyncRoot; }
            }

            #endregion
            #region Public Methods

            public override int Add(Order value) {
                throw new NotSupportedException(
                    "Read-only collections cannot be modified.");
            }

            public override void AddRange(OrderList collection) {
                throw new NotSupportedException(
                    "Read-only collections cannot be modified.");
            }

            public override void AddRange(Order[] array) {
                throw new NotSupportedException(
                    "Read-only collections cannot be modified.");
            }

            public override int BinarySearch(Order value) {
                return this._collection.BinarySearch(value);
            }

            public override void Clear() {
                throw new NotSupportedException(
                    "Read-only collections cannot be modified.");
            }

            public override object Clone() {
                return new ReadOnlyList((OrderList) this._collection.Clone());
            }

            public override void CopyTo(Order[] array) {
                this._collection.CopyTo(array);
            }

            public override void CopyTo(Order[] array, int arrayIndex) {
                this._collection.CopyTo(array, arrayIndex);
            }

            public override IOrderEnumerator GetEnumerator() {
                return this._collection.GetEnumerator();
            }

            public override int IndexOf(Order value) {
                return this._collection.IndexOf(value);
            }

            public override void Insert(int index, Order value) {
                throw new NotSupportedException(
                    "Read-only collections cannot be modified.");
            }

            public override void Remove(Order value) {
                throw new NotSupportedException(
                    "Read-only collections cannot be modified.");
            }

            public override void RemoveAt(int index) {
                throw new NotSupportedException(
                    "Read-only collections cannot be modified.");
            }

            public override void RemoveRange(int index, int count) {
                throw new NotSupportedException(
                    "Read-only collections cannot be modified.");
            }

            public override void Reverse() {
                throw new NotSupportedException(
                    "Read-only collections cannot be modified.");
            }

            public override void Reverse(int index, int count) {
                throw new NotSupportedException(
                    "Read-only collections cannot be modified.");
            }

            public override void Sort() {
                throw new NotSupportedException(
                    "Read-only collections cannot be modified.");
            }

            public override void Sort(IComparer comparer) {
                throw new NotSupportedException(
                    "Read-only collections cannot be modified.");
            }

            public override void Sort(int index, int count, IComparer comparer) {
                throw new NotSupportedException(
                    "Read-only collections cannot be modified.");
            }

            public override Order[] ToArray() {
                return this._collection.ToArray();
            }

            public override void TrimToSize() {
                throw new NotSupportedException(
                    "Read-only collections cannot be modified.");
            }

            #endregion
        }

        #endregion
        #region Class SyncList

        [Serializable]
        private sealed class SyncList: OrderList {
            #region Private Fields

            private OrderList _collection;
            private object _root;

            #endregion
            #region Internal Constructors

            internal SyncList(OrderList collection):
                base(Tag.Default) {

                this._root = collection.SyncRoot;
                this._collection = collection;
            }

            #endregion
            #region Protected Properties

            protected override Order[] InnerArray {
                get { lock (this._root) return this._collection.InnerArray; }
            }

            #endregion
            #region Public Properties

            public override int Capacity {
                get { lock (this._root) return this._collection.Capacity; }
                set { lock (this._root) this._collection.Capacity = value; }
            }

            public override int Count {
                get { lock (this._root) return this._collection.Count; }
            }

            public override bool IsFixedSize {
                get { return this._collection.IsFixedSize; }
            }

            public override bool IsReadOnly {
                get { return this._collection.IsReadOnly; }
            }

            public override bool IsSynchronized {
                get { return true; }
            }

            public override bool IsUnique {
                get { return this._collection.IsUnique; }
            }

            public override Order this[int index] {
                get { lock (this._root) return this._collection[index]; }
                set { lock (this._root) this._collection[index] = value;  }
            }

            public override object SyncRoot {
                get { return this._root; }
            }

            #endregion
            #region Public Methods

            public override int Add(Order value) {
                lock (this._root) return this._collection.Add(value);
            }

            public override void AddRange(OrderList collection) {
                lock (this._root) this._collection.AddRange(collection);
            }

            public override void AddRange(Order[] array) {
                lock (this._root) this._collection.AddRange(array);
            }

            public override int BinarySearch(Order value) {
                lock (this._root) return this._collection.BinarySearch(value);
            }

            public override void Clear() {
                lock (this._root) this._collection.Clear();
            }

            public override object Clone() {
                lock (this._root)
                    return new SyncList((OrderList) this._collection.Clone());
            }

            public override void CopyTo(Order[] array) {
                lock (this._root) this._collection.CopyTo(array);
            }

            public override void CopyTo(Order[] array, int arrayIndex) {
                lock (this._root) this._collection.CopyTo(array, arrayIndex);
            }

            public override IOrderEnumerator GetEnumerator() {
                lock (this._root) return this._collection.GetEnumerator();
            }

            public override int IndexOf(Order value) {
                lock (this._root) return this._collection.IndexOf(value);
            }

            public override void Insert(int index, Order value) {
                lock (this._root) this._collection.Insert(index, value);
            }

            public override void Remove(Order value) {
                lock (this._root) this._collection.Remove(value);
            }

            public override void RemoveAt(int index) {
                lock (this._root) this._collection.RemoveAt(index);
            }

            public override void RemoveRange(int index, int count) {
                lock (this._root) this._collection.RemoveRange(index, count);
            }

            public override void Reverse() {
                lock (this._root) this._collection.Reverse();
            }

            public override void Reverse(int index, int count) {
                lock (this._root) this._collection.Reverse(index, count);
            }

            public override void Sort() {
                lock (this._root) this._collection.Sort();
            }

            public override void Sort(IComparer comparer) {
                lock (this._root) this._collection.Sort(comparer);
            }

            public override void Sort(int index, int count, IComparer comparer) {
                lock (this._root) this._collection.Sort(index, count, comparer);
            }

            public override Order[] ToArray() {
                lock (this._root) return this._collection.ToArray();
            }

            public override void TrimToSize() {
                lock (this._root) this._collection.TrimToSize();
            }

            #endregion
        }

        #endregion
        #region Class UniqueList

        [Serializable]
        private sealed class UniqueList: OrderList {
            #region Private Fields

            private OrderList _collection;

            #endregion
            #region Internal Constructors

            internal UniqueList(OrderList collection):
                base(Tag.Default) {
                this._collection = collection;
            }

            #endregion
            #region Protected Properties

            protected override Order[] InnerArray {
                get { return this._collection.InnerArray; }
            }

            #endregion
            #region Public Properties

            public override int Capacity {
                get { return this._collection.Capacity; }
                set { this._collection.Capacity = value; }
            }

            public override int Count {
                get { return this._collection.Count; }
            }

            public override bool IsFixedSize {
                get { return this._collection.IsFixedSize; }
            }

            public override bool IsReadOnly {
                get { return this._collection.IsReadOnly; }
            }

            public override bool IsSynchronized {
                get { return this._collection.IsSynchronized; }
            }

            public override bool IsUnique {
                get { return true; }
            }

            public override Order this[int index] {
                get { return this._collection[index]; }
                set {
                    CheckUnique(index, value);
                    this._collection[index] = value;
                }
            }

            public override object SyncRoot {
                get { return this._collection.SyncRoot; }
            }

            #endregion
            #region Public Methods

            public override int Add(Order value) {
                CheckUnique(value);
                return this._collection.Add(value);
            }

            public override void AddRange(OrderList collection) {
                foreach (Order value in collection)
                    CheckUnique(value);
            
                this._collection.AddRange(collection);
            }

            public override void AddRange(Order[] array) {
                foreach (Order value in array)
                    CheckUnique(value);
            
                this._collection.AddRange(array);
            }

            public override int BinarySearch(Order value) {
                return this._collection.BinarySearch(value);
            }

            public override void Clear() {
                this._collection.Clear();
            }

            public override object Clone() {
                return new UniqueList((OrderList) this._collection.Clone());
            }

            public override void CopyTo(Order[] array) {
                this._collection.CopyTo(array);
            }

            public override void CopyTo(Order[] array, int arrayIndex) {
                this._collection.CopyTo(array, arrayIndex);
            }

            public override IOrderEnumerator GetEnumerator() {
                return this._collection.GetEnumerator();
            }

            public override int IndexOf(Order value) {
                return this._collection.IndexOf(value);
            }

            public override void Insert(int index, Order value) {
                CheckUnique(value);
                this._collection.Insert(index, value);
            }

            public override void Remove(Order value) {
                this._collection.Remove(value);
            }

            public override void RemoveAt(int index) {
                this._collection.RemoveAt(index);
            }

            public override void RemoveRange(int index, int count) {
                this._collection.RemoveRange(index, count);
            }

            public override void Reverse() {
                this._collection.Reverse();
            }

            public override void Reverse(int index, int count) {
                this._collection.Reverse(index, count);
            }

            public override void Sort() {
                this._collection.Sort();
            }

            public override void Sort(IComparer comparer) {
                this._collection.Sort(comparer);
            }

            public override void Sort(int index, int count, IComparer comparer) {
                this._collection.Sort(index, count, comparer);
            }

            public override Order[] ToArray() {
                return this._collection.ToArray();
            }

            public override void TrimToSize() {
                this._collection.TrimToSize();
            }

            #endregion
            #region Private Methods

            private void CheckUnique(Order value) {
                if (IndexOf(value) >= 0)
                    throw new NotSupportedException(
                        "Unique collections cannot contain duplicate elements.");
            }

            private void CheckUnique(int index, Order value) {
                int existing = IndexOf(value);
                if (existing >= 0 && existing != index)
                    throw new NotSupportedException(
                        "Unique collections cannot contain duplicate elements.");
            }

            #endregion
        }

        #endregion
    }

    #endregion
}
